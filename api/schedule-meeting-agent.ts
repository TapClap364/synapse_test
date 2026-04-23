import { z } from 'zod';
import { createHandler } from './_lib/handler';
import { getServiceSupabase } from './_lib/supabase';
import { getOpenAI, AI_MODEL, safeParseAiJson } from './_lib/openai';
import { HttpError } from './_lib/errors';

const InputSchema = z.object({
  epic_id: z.number().int().positive().optional(),
  task_titles: z.array(z.string().max(200)).max(50).optional(),
  prompt: z.string().max(2_000).optional(),
});

const ResultSchema = z.object({
  title: z.string().min(1).max(200),
  agenda: z.array(z.string().max(300)).max(20),
  duration_minutes: z.number().int().min(5).max(480).optional().default(45),
  justification: z.string().max(1_000).optional().default(''),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai', requireWrite: true },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    let epicTitle = 'Синхронизация по проекту';
    let epicDescription = '';
    let tasksStr = '';

    if (body.epic_id) {
      const { data: epic } = await supabase
        .from('epics')
        .select('id, title, description')
        .eq('id', body.epic_id)
        .eq('workspace_id', auth.workspaceId)
        .maybeSingle();
      if (epic) {
        epicTitle = epic.title;
        epicDescription = epic.description ?? '';
      }
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, status')
        .eq('epic_id', body.epic_id)
        .eq('workspace_id', auth.workspaceId);
      tasksStr = (tasks ?? []).map((t) => `- [${t.status}] ${t.title}`).join('\n');
    } else if (body.task_titles && body.task_titles.length > 0) {
      tasksStr = body.task_titles.map((t) => `- ${t}`).join('\n');
    }

    const systemPrompt = `You are an AI Calendar Scheduling Agent for a project management tool called Synapse AI.
Your goal is to analyze the provided Epic/Tasks context and schedule a productive sync meeting.

CRITICAL: All text fields (title, agenda, justification) MUST be in RUSSIAN language.

Context / Epic: ${epicTitle}
Description: ${epicDescription}

Tasks to discuss:
${tasksStr || 'Общий статус проекта'}

Output must be pure JSON:
{
  "title": "Заголовок встречи на русском",
  "agenda": ["Пункт 1", "Пункт 2"],
  "duration_minutes": 45,
  "justification": "Обоснование на русском"
}`;

    const response = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: body.prompt ?? 'Analyze tasks and schedule a sync.' },
      ],
      response_format: { type: 'json_object' },
    });

    const raw = safeParseAiJson(response.choices[0]?.message?.content);
    if (!raw) throw new HttpError(502, 'AI returned invalid JSON');
    const parsed = ResultSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(502, 'AI response did not match expected schema', parsed.error.flatten());
    }

    const { data: meeting, error: meetingErr } = await supabase
      .from('meetings')
      .insert({
        title: parsed.data.title,
        summary: `Justification: ${parsed.data.justification}\n\nAgenda:\n${parsed.data.agenda
          .map((a) => '- ' + a)
          .join('\n')}`,
        workspace_id: auth.workspaceId,
      })
      .select()
      .single();
    if (meetingErr) throw meetingErr;

    res.status(200).json({
      success: true,
      meeting: parsed.data,
      meeting_id: meeting.id,
    });
  }
);
