import { z } from 'zod';
import { createHandler } from './_lib/handler.js';
import { getServiceSupabase } from './_lib/supabase.js';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai.js';
import { HttpError } from './_lib/errors.js';
import { buildEpicContext, resolveOrCreateEpic } from './_lib/epicResolver.js';

const InputSchema = z.object({
  notes: z.array(z.string().min(1).max(2_000)).min(1).max(100),
});

const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2_000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  epic_title: z.string().min(1).max(120),
  estimated_hours: z.number().min(0).max(1000).optional().default(4),
  blocked_by: z.array(z.number().int().positive()).optional().default([]),
  subtasks: z.array(z.string().max(300)).optional().default([]),
});

const AiResultSchema = z.object({
  tasks: z.array(TaskSchema).max(50),
});

const normalize = (text: string): string => text.toLowerCase().trim().replace(/\s+/g, ' ');

const isSimilar = (a: string, b: string): boolean => {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const dist = levenshtein(na, nb);
  const max = Math.max(na.length, nb.length);
  return max > 0 && dist / max < 0.2;
};

const levenshtein = (s1: string, s2: string): number => {
  const dp: number[][] = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(0));
  for (let i = 0; i <= s1.length; i += 1) dp[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) dp[j][0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[j][i] = Math.min(dp[j][i - 1] + 1, dp[j - 1][i] + 1, dp[j - 1][i - 1] + cost);
    }
  }
  return dp[s2.length][s1.length];
};

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai', requireWrite: true },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('id, title, description')
      .eq('workspace_id', auth.workspaceId)
      .order('created_at', { ascending: false })
      .limit(100);

    const { epics, promptText: epicContext } = await buildEpicContext(supabase, auth.workspaceId);

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты AI Project Manager. Проанализируй стикеры с брейншторма и создай структурированные задачи.

ПРАВИЛА выбора эпика для каждой задачи (epic_title) — КРИТИЧНО:
1. Если задача тематически РОВНО подходит к одному из существующих эпиков ниже — верни ТОЧНО его название (символ-в-символ).
2. Если ни один не подходит — придумай НОВОЕ короткое осмысленное название эпика на русском (≤ 3 слова).
3. ЗАПРЕЩЕНО возвращать "General"/"Other"/"Misc"/"Прочее"/"Разное"/"Общее".

Существующие эпики проекта:
${epicContext}

Группируй стикеры по смыслу. Если несколько стикеров об одной теме — объединяй их в одну задачу с подзадачами (subtasks).

Верни СТРОГО JSON объект с ключом "tasks":
{ "tasks": [
    { "title": "...", "description": "...", "priority": "low|medium|high|critical",
      "epic_title": "точное название существующего ИЛИ новое короткое осмысленное",
      "estimated_hours": number, "blocked_by": number[], "subtasks": string[] }
] }`,
        },
        { role: 'user', content: `Стикеры с доски:\n${body.notes.join('\n')}` },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = safeParseAiJson(completion.choices[0]?.message?.content);
    if (!raw) throw new HttpError(502, 'AI returned invalid JSON');
    const parsed = AiResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(502, 'AI response did not match expected schema', parsed.error.flatten());
    }

    const created: unknown[] = [];
    const skipped: string[] = [];

    for (const task of parsed.data.tasks) {
      const isDup = existingTasks?.some((existing) => {
        const titleSim = isSimilar(task.title, existing.title);
        const descSim =
          task.description && existing.description
            ? isSimilar(task.description, existing.description)
            : false;
        return titleSim || descSim;
      });
      if (isDup) {
        skipped.push(task.title);
        continue;
      }

      const epicId = await resolveOrCreateEpic(supabase, auth.workspaceId, epics, task.epic_title);

      const subtasksMd =
        task.subtasks.length > 0
          ? `\n\n### Подзадачи (AI):\n${task.subtasks.map((s) => `- [ ] ${s}`).join('\n')}`
          : '';

      const { data: newTask, error: insErr } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: `${task.description} (С whiteboard)${subtasksMd}`,
          priority: task.priority,
          estimated_hours: task.estimated_hours,
          status: 'backlog',
          epic_id: epicId,
          blocked_by: task.blocked_by,
          workspace_id: auth.workspaceId,
        })
        .select()
        .single();

      if (!insErr && newTask) created.push(newTask);
    }

    let message = `Создано ${created.length} задач`;
    if (skipped.length > 0) message += ` (пропущено ${skipped.length} дубликатов)`;

    res.status(200).json({ message, tasks: created, skipped });
  }
);
