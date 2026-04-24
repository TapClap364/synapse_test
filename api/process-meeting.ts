import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai.js';
import { HttpError } from './_lib/errors.js';
import { buildEpicContext, resolveOrCreateEpic } from './_lib/epicResolver.js';

const InputSchema = z.object({
  text: z.string().min(10).max(50_000),
  title: z.string().max(200).optional(),
});

const MindMapNode: z.ZodType<{ label: string; children?: unknown[] }> = z.lazy(() =>
  z.object({
    label: z.string(),
    children: z.array(MindMapNode).optional(),
  })
);

const AiResultSchema = z.object({
  goal: z.string().max(500).optional().default(''),
  decisions: z.array(z.string().max(500)).max(20).optional().default([]),
  action_items: z.array(z.string().max(500)).max(30).optional().default([]),
  participants: z.array(z.string().max(120)).max(30).optional().default([]),
  mind_map: MindMapNode.optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2_000).optional().default(''),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
        estimated_hours: z.number().min(0).max(1000).optional().default(2),
        epic_title: z.string().min(1).max(120),
      })
    )
    .max(50)
    .optional()
    .default([]),
});

function renderProtocolMarkdown(p: {
  goal: string;
  decisions: string[];
  action_items: string[];
  participants: string[];
}): string {
  const sections: string[] = [];
  if (p.goal.trim()) sections.push(`## Цель\n${p.goal.trim()}`);
  if (p.decisions.length) sections.push(`## Ключевые решения\n${p.decisions.map((d) => `- ${d}`).join('\n')}`);
  if (p.action_items.length) sections.push(`## Action Items\n${p.action_items.map((a) => `- ${a}`).join('\n')}`);
  if (p.participants.length) sections.push(`## Участники\n${p.participants.map((u) => `- ${u}`).join('\n')}`);
  return sections.join('\n\n');
}

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai', requireWrite: true },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    const { epics: existingEpics, promptText: epicContext } = await buildEpicContext(supabase, auth.workspaceId);

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты AI Secretary & Project Manager. Проанализируй текст встречи и извлеки структурированный протокол.

ПРАВИЛА выбора эпика для каждой задачи (epic_title) — КРИТИЧНО:
1. Если задача тематически РОВНО подходит к одному из существующих эпиков ниже — верни ТОЧНО его название (символ-в-символ).
2. Если ни один не подходит — придумай НОВОЕ короткое осмысленное название эпика на русском (≤ 3 слова).
3. ЗАПРЕЩЕНО возвращать "General"/"Other"/"Misc"/"Прочее"/"Разное"/"Общее".

Существующие эпики проекта:
${epicContext}

Верни СТРОГО JSON:
{
  "goal": "Одна-две фразы — зачем встретились",
  "decisions": ["Принятое решение 1", "Решение 2"],
  "action_items": ["Что-то сделать к дате — ответственный (если упомянут)"],
  "participants": ["Имя 1", "Имя 2"],
  "mind_map": { "label": "Главная тема встречи", "children": [{ "label": "Ветка 1", "children": [{ "label": "Деталь" }] }] },
  "tasks": [
    {
      "title": "Задача",
      "description": "Описание",
      "priority": "low"|"medium"|"high"|"critical",
      "estimated_hours": number,
      "epic_title": "точное название существующего ИЛИ новое короткое осмысленное"
    }
  ]
}
Если какой-то секции нет в тексте — верни пустой массив/строку. Не выдумывай. mind_map должен наглядно отражать структуру обсуждения.`,
        },
        { role: 'user', content: body.text },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = safeParseAiJson(completion.choices[0]?.message?.content);
    if (!raw) throw new HttpError(502, 'AI returned invalid JSON');

    const parsed = AiResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(502, 'AI response did not match expected schema', parsed.error.flatten());
    }
    const aiResult = parsed.data;
    const summaryMarkdown = renderProtocolMarkdown(aiResult);

    const { data: meeting, error: meetErr } = await supabase
      .from('meetings')
      .insert({
        title: body.title ?? `Meeting ${new Date().toLocaleString('ru-RU')}`,
        summary: summaryMarkdown,
        mind_map_data: aiResult.mind_map ?? null,
        workspace_id: auth.workspaceId,
      })
      .select()
      .single();
    if (meetErr) throw new HttpError(500, `Failed to save meeting: ${meetErr.message}`);

    let tasksCreatedCount = 0;
    for (const task of aiResult.tasks) {
      const epicId = await resolveOrCreateEpic(supabase, auth.workspaceId, existingEpics, task.epic_title);

      const { error: insErr } = await supabase.from('tasks').insert({
        title: task.title,
        description: `${task.description} (Из встречи)`,
        priority: task.priority,
        estimated_hours: task.estimated_hours,
        status: 'backlog',
        blocked_by: [],
        epic_id: epicId,
        workspace_id: auth.workspaceId,
      });
      if (!insErr) tasksCreatedCount += 1;
    }

    res.status(200).json({
      message: 'Meeting processed',
      meeting_id: meeting.id,
      summary: summaryMarkdown,
      tasksCreated: tasksCreatedCount,
    });
  }
);
