import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai.js';
import { HttpError } from './_lib/errors.js';

const InputSchema = z.object({
  task_id: z.number().int().positive(),
});

const ResultSchema = z.object({
  suggestions: z.array(z.string().max(500)).max(5),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai' },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    // Load the task scoped to the current workspace
    const { data: task, error: taskErr } = await supabase
      .from('tasks')
      .select('title, description')
      .eq('id', body.task_id)
      .eq('workspace_id', auth.workspaceId)
      .maybeSingle();
    if (taskErr) throw new HttpError(500, 'Failed to load task');
    if (!task) throw new HttpError(404, 'Task not found');

    const { data: comments } = await supabase
      .from('comments')
      .select('content, profiles(full_name)')
      .eq('task_id', body.task_id)
      .eq('workspace_id', auth.workspaceId)
      .order('created_at', { ascending: false })
      .limit(10);

    const commentLines =
      comments
        ?.map((c) => {
          const name =
            (c.profiles as { full_name?: string | null } | null)?.full_name ?? 'User';
          return `${name}: ${c.content}`;
        })
        .reverse()
        .join('\n') ?? '';

    const context = `
Задача: ${task.title}
Описание: ${task.description ?? ''}
Последние комментарии:
${commentLines}
    `.trim();

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты помощник в обсуждении задач. Проанализируй контекст и предложи 3 коротких варианта ответа или следующее действие.
Верни СТРОГО JSON: { "suggestions": ["Вариант 1", "Вариант 2", "Вариант 3"] }`,
        },
        { role: 'user', content: context },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = safeParseAiJson(completion.choices[0]?.message?.content);
    const parsed = ResultSchema.safeParse(raw ?? { suggestions: [] });
    res.status(200).json(parsed.success ? parsed.data : { suggestions: [] });
  }
);
