import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai.js';
import { HttpError } from './_lib/errors.js';
import { buildEpicContext, resolveOrCreateEpic } from './_lib/epicResolver.js';

const InputSchema = z.object({
  voice_text: z.string().min(3).max(8_000),
});

const AiResultSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4_000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  // No default — AI MUST return either an exact existing title or a meaningful new one
  epic_title: z.string().min(1).max(120),
  estimated_hours: z.number().min(0).max(1000).optional().default(2),
  blocked_by: z.array(z.number().int().positive()).optional().default([]),
  subtasks: z.array(z.string().max(300)).optional().default([]),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, requireWrite: true, rateLimit: 'ai' },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    const { epics, promptText: epicContext } = await buildEpicContext(supabase, auth.workspaceId);

    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, title, status, epic_id')
      .eq('workspace_id', auth.workspaceId)
      .order('created_at', { ascending: false })
      .limit(5);

    const taskContext =
      recentTasks?.map((t) => `ID:${t.id} [${t.status}] "${t.title}"`).join('\n') ||
      'Нет существующих задач';

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты Lead Project Manager. Проанализируй голосовое сообщение и создай задачу.

ПРАВИЛА выбора эпика (epic_title) — КРИТИЧНО:
1. Если задача тематически РОВНО подходит к одному из существующих эпиков ниже — верни ТОЧНО его название (символ-в-символ).
2. Если ни один существующий не подходит — придумай НОВОЕ короткое осмысленное название эпика на русском (≤ 3 слова), отражающее тему.
3. ЗАПРЕЩЕНО возвращать "General", "Other", "Misc", "Прочее", "Разное", "Общее" — это не эпики.

Существующие эпики проекта:
${epicContext}

Зависимости (blocked_by): если задача логически НЕ может начаться без завершения одной из существующих задач — укажи её ID.
Существующие задачи (последние 5):
${taskContext}

Верни СТРОГО JSON объект:
{
  "title": "Короткий заголовок задачи",
  "description": "Подробное описание",
  "priority": "low" | "medium" | "high" | "critical",
  "epic_title": "точное название существующего ИЛИ новое короткое осмысленное",
  "estimated_hours": number,
  "blocked_by": number[],
  "subtasks": string[]
}`,
        },
        { role: 'user', content: body.voice_text },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = safeParseAiJson(completion.choices[0]?.message?.content);
    if (!raw) {
      throw new HttpError(502, 'AI returned invalid JSON');
    }
    const parsed = AiResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(502, 'AI response did not match expected schema', parsed.error.flatten());
    }
    const aiData = parsed.data;

    const epicId = await resolveOrCreateEpic(supabase, auth.workspaceId, epics, aiData.epic_title);

    const subtasksMd =
      aiData.subtasks.length > 0
        ? `\n\n### Подзадачи (AI):\n${aiData.subtasks.map((s) => `- [ ] ${s}`).join('\n')}`
        : '';

    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        title: aiData.title,
        description: `${aiData.description}${subtasksMd}`,
        priority: aiData.priority,
        estimated_hours: aiData.estimated_hours,
        epic_id: epicId,
        status: 'backlog',
        blocked_by: aiData.blocked_by,
        board_x: Math.random() * 800,
        board_y: Math.random() * 600,
        workspace_id: auth.workspaceId,
      })
      .select()
      .single();

    if (taskErr || !task) {
      throw new HttpError(500, `Failed to create task: ${taskErr?.message ?? 'unknown'}`);
    }

    res.status(200).json(task);
  }
);
