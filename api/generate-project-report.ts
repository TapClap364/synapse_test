/* eslint-disable @typescript-eslint/no-explicit-any */
import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Report Generator",
  },
});

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Fetch all Epics and Tasks
    const { data: epics, error: epicsError } = await supabase.from('epics').select('*');
    if (epicsError) throw epicsError;

    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
    if (tasksError) throw tasksError;

    const { data: profiles } = await supabase.from('profiles').select('*');

    // 2. Prepare Context
    const tasksByEpic = (epics || []).map(epic => {
      const epicTasks = (tasks || []).filter(t => t.epic_id === epic.id);
      return `Epic: ${epic.title}\nTasks:\n${epicTasks.map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority})`).join('\n')}`;
    }).join('\n\n');

    const noEpicTasks = (tasks || []).filter(t => !t.epic_id);
    const noEpicStr = noEpicTasks.length > 0 ? `Unassigned Tasks:\n${noEpicTasks.map(t => `- [${t.status}] ${t.title}`).join('\n')}` : '';

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
${noEpicStr}
`;

    // 3. Generate Report via AI
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.3,
    });

    const aiReportHtml = response.choices[0].message.content || '<h1>No report generated</h1>';

    // 4. Save to Wiki (documents table)
    const title = `AI Project Report - ${new Date().toLocaleDateString()}`;
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        title,
        content: { html: aiReportHtml }, // Сохраняем как JSON объект для jsonb
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (docError) throw docError;

    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      document_id: doc.id
    });

  } catch (error: any) {
    console.error('Report Generation Error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
