import { z } from 'zod';
import { createHandler } from './_lib/handler';
import { getServiceSupabase } from './_lib/supabase';
import { getOpenAI, AI_MODEL } from './_lib/openai';

const InputSchema = z.object({}).optional().default({});

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai', requireWrite: true },
  async ({ auth, res }) => {
    const supabase = getServiceSupabase();

    const [{ data: epics }, { data: tasks }] = await Promise.all([
      supabase.from('epics').select('id, title').eq('workspace_id', auth.workspaceId),
      supabase.from('tasks').select('id, title, status, priority, epic_id').eq('workspace_id', auth.workspaceId),
    ]);

    const tasksByEpic = (epics ?? [])
      .map((epic) => {
        const epicTasks = (tasks ?? []).filter((t) => t.epic_id === epic.id);
        const taskList = epicTasks
          .map((t) => `- [${t.status}] ${t.title} (Priority: ${t.priority})`)
          .join('\n');
        return `Epic: ${epic.title}\nTasks:\n${taskList || '(нет задач)'}`;
      })
      .join('\n\n');

    const noEpicTasks = (tasks ?? []).filter((t) => !t.epic_id);
    const noEpicStr =
      noEpicTasks.length > 0
        ? `Unassigned Tasks:\n${noEpicTasks.map((t) => `- [${t.status}] ${t.title}`).join('\n')}`
        : '';

    const systemPrompt = `You are an AI Project Manager (Synapse AI Orchestrator).
Your goal is to analyze the current state of the project and generate a comprehensive HTML report.

CRITICAL: The entire report MUST be in RUSSIAN language.
Use professional business Russian (деловой русский язык).

The report should include:
1. Исполнительное резюме о здоровье проекта.
2. Анализ по эпикам (прогресс и узкие места).
3. Критические задачи, требующие немедленного внимания.
4. Рекомендованные следующие шаги для команды.

Use standard semantic HTML (<h1>, <h2>, <p>, <ul>, <li>, <strong>). Do not use markdown backticks, just raw HTML.

Current Project State:
${tasksByEpic}
${noEpicStr}`;

    const response = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.3,
    });

    const html = response.choices[0]?.message?.content ?? '<h1>No report generated</h1>';

    const title = `AI Project Report — ${new Date().toLocaleDateString('ru-RU')}`;
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        title,
        content: { html },
        workspace_id: auth.workspaceId,
      })
      .select()
      .single();
    if (docErr) throw docErr;

    res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      document_id: doc.id,
    });
  }
);
