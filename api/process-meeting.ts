import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai.js';
import { HttpError } from './_lib/errors.js';

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
  summary: z.string().max(2_000).optional().default(''),
  mind_map: MindMapNode.optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(2_000).optional().default(''),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
        estimated_hours: z.number().min(0).max(1000).optional().default(2),
        epic_title: z.string().max(120).optional().default('General'),
      })
    )
    .max(50)
    .optional()
    .default([]),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai', requireWrite: true },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    const { data: existingEpics } = await supabase
      .from('epics')
      .select('id, title')
      .eq('workspace_id', auth.workspaceId);
    const epicList =
      existingEpics?.map((e) => e.title).join(', ') ||
      'General, Backend, Frontend, Design, Marketing';

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты AI Secretary & Project Manager. Проанализируй текст встречи.
Доступные эпики: [${epicList}]
Верни СТРОГО JSON:
{
  "summary": "Краткое резюме (3-5 предложений)",
  "mind_map": { "label": "Главная тема", "children": [{ "label": "Ветка 1", "children": [] }] },
  "tasks": [
    {
      "title": "Задача",
      "description": "Описание",
      "priority": "low"|"medium"|"high",
      "estimated_hours": number,
      "epic_title": "Название подходящего эпика из списка или создай новый"
    }
  ]
}`,
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

    const { data: meeting, error: meetErr } = await supabase
      .from('meetings')
      .insert({
        title: body.title ?? `Meeting ${new Date().toLocaleString('ru-RU')}`,
        summary: aiResult.summary,
        // mind_map_data is jsonb — Zod has validated structure
        mind_map_data: aiResult.mind_map ?? null,
        workspace_id: auth.workspaceId,
      })
      .select()
      .single();
    if (meetErr) throw new HttpError(500, `Failed to save meeting: ${meetErr.message}`);

    let tasksCreatedCount = 0;
    for (const task of aiResult.tasks) {
      let epicId: number | null = null;
      const wantTitle = task.epic_title.toLowerCase();
      const found = existingEpics?.find((e) => {
        const t = e.title.toLowerCase();
        return t.includes(wantTitle) || wantTitle.includes(t);
      });

      if (found) {
        epicId = found.id;
      } else if (task.epic_title) {
        const { data: newEpic } = await supabase
          .from('epics')
          .insert({ title: task.epic_title, workspace_id: auth.workspaceId })
          .select()
          .single();
        epicId = newEpic?.id ?? null;
      }

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
      summary: aiResult.summary,
      mindMap: aiResult.mind_map ?? null,
      tasksCreated: tasksCreatedCount,
    });
  }
);
