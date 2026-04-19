import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Calendar Agent",
  },
});

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { epic_id, task_titles, prompt } = req.body;

  try {
    let epicTitle = 'Синхронизация по проекту';
    let epicDescription = '';
    let tasksStr = '';

    if (epic_id) {
      const { data: epic, error: epicError } = await supabase
        .from('epics')
        .select('*')
        .eq('id', epic_id)
        .single();
      if (!epicError && epic) {
        epicTitle = epic.title;
        epicDescription = epic.description || '';
      }

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('epic_id', epic_id);
      if (!tasksError && tasks) {
        tasksStr = tasks.map((t: any) => `- [${t.status}] ${t.title}`).join('\n');
      }
    } else if (task_titles && Array.isArray(task_titles)) {
      tasksStr = task_titles.map((t: string) => `- ${t}`).join('\n');
    }

    const systemPrompt = `You are an AI Calendar Scheduling Agent for a project management tool called Synapse AI.
Your goal is to analyze the provided Epic/Tasks context and schedule a productive sync meeting.
You must return the meeting details in valid JSON format.

Context / Epic: ${epicTitle}
Description: ${epicDescription}

Tasks to discuss:
${tasksStr || 'General project status'}

Based on this context and the user's prompt (if any), propose a meeting title, agenda (bullet points), duration in minutes, and a justification for why this meeting is needed.
Output must be pure JSON:
{
  "title": "Proposed meeting title",
  "agenda": ["Point 1", "Point 2"],
  "duration_minutes": 45,
  "justification": "Why we need this meeting based on tasks"
}
`;

    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt || 'Analyze tasks and schedule a sync.' }
      ],
      response_format: { type: 'json_object' }
    });

    const aiResult = response.choices[0].message.content;
    if (!aiResult) throw new Error('No AI response');

    const parsedData = JSON.parse(aiResult);

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title: parsedData.title,
        summary: `Justification: ${parsedData.justification}\n\nAgenda:\n${parsedData.agenda.map((a: string) => '- ' + a).join('\n')}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    return res.status(200).json({
      success: true,
      meeting: parsedData,
      meeting_id: meeting.id
    });

  } catch (error: unknown) {
    console.error('Schedule Agent error:', error);
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errMessage });
  }
}
