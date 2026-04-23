import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai.js';
import { HttpError } from './_lib/errors.js';

const InputSchema = z.object({
  voice_text: z.string().min(3).max(8_000),
});

const AiResultSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4_000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  epic_title: z.string().min(1).max(120).optional().default('General'),
  estimated_hours: z.number().min(0).max(1000).optional().default(2),
  blocked_by: z.array(z.number().int().positive()).optional().default([]),
  subtasks: z.array(z.string().max(300)).optional().default([]),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, requireWrite: true, rateLimit: 'ai' },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    const { data: epics } = await supabase
      .from('epics')
      .select('id, title')
      .eq('workspace_id', auth.workspaceId);

    const epicList =
      epics?.map((e) => e.title).join(', ') ||
      'General, Backend, Frontend, Design, Marketing';

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
          content: `Ты Lead Project Manager.
Твоя задача: проанализировать голосовое сообщение и создать задачу.

ВАЖНО:
1. Определи зависимости (blocked_by). Если новая задача логически не может начаться БЕЗ завершения одной из существующих задач, укажи её ID в массиве blocked_by.
2. Выбери подходящий эпик из списка или предложи новый.

Доступные Эпики: [${epicList}]
Существующие задачи (контекст):
${taskContext}

Верни СТРОГО JSON объект:
{
  "title": "Короткий заголовок",
  "description": "Подробное описание",
  "priority": "low" | "medium" | "high" | "critical",
  "epic_title": "Название эпика (выбери из списка или создай новый)",
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

    let epicId: number | null = null;
    const wantTitle = aiData.epic_title.toLowerCase().trim();
    const existingEpic = epics?.find((e) => {
      const t = e.title.toLowerCase().trim();
      return t.includes(wantTitle) || wantTitle.includes(t);
    });

    if (existingEpic) {
      epicId = existingEpic.id;
    } else {
      const { data: newEpic, error: epicErr } = await supabase
        .from('epics')
        .insert({ title: aiData.epic_title, workspace_id: auth.workspaceId })
        .select()
        .single();
      if (epicErr || !newEpic) {
        throw new HttpError(500, `Failed to create epic: ${epicErr?.message ?? 'unknown'}`);
      }
      epicId = newEpic.id;
    }

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
