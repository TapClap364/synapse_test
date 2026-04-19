/* eslint-disable @typescript-eslint/no-explicit-any */
import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Fetch tasks and profiles
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('id, title, description, assigned_to, blocked_by');
    if (tasksError) throw tasksError;

    const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, full_name');
    if (profilesError) throw profilesError;

    if (!tasks || tasks.length === 0) {
      return res.status(200).json({ success: true, message: 'No tasks to orchestrate', updates: 0 });
    }

    if (!profiles || profiles.length === 0) {
      return res.status(200).json({ success: true, message: 'No profiles available for assignment', updates: 0 });
    }

    const tasksJson = JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, description: t.description })));
    const profilesJson = JSON.stringify(profiles.map(p => ({ id: p.id, name: p.full_name || 'Unknown User' })));

    // 2. Prepare Prompt
    const systemPrompt = `You are the Synapse AI Task Orchestrator.
Your goal is to organize a project backlog by assigning tasks to the most suitable team members and determining dependencies (which task blocks which).

Available Profiles:
${profilesJson}

Available Tasks:
${tasksJson}

Rules:
1. Assign a 'profile_id' to each task based on logical distribution. If roles are unclear, distribute evenly among available users to ensure everyone has work.
2. Determine dependencies ('blocked_by'). If Task A cannot start before Task B finishes, then Task A's 'blocked_by' array should include Task B's ID.
3. Return a pure JSON object with a single key 'updates' containing an array of update objects.

Expected Output Format:
{
  "updates": [
    {
      "task_id": 123,
      "assigned_to": "profile-uuid-here",
      "blocked_by": [120, 121]
    }
  ]
}
`;

    // 3. AI Execution
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' } // Workaround to ensure JSON. Let's ask for an object containing an array.
    });

    const aiResultStr = response.choices[0].message.content || '{"updates":[]}';
    let parsedData;
    try {
      parsedData = JSON.parse(aiResultStr);
    } catch {
      // In case the AI returned raw array despite json_object
      const match = aiResultStr.match(/\[.*\]/s);
      if (match) parsedData = { updates: JSON.parse(match[0]) };
      else throw new Error('Failed to parse AI response');
    }

    const updates = Array.isArray(parsedData) ? parsedData : (parsedData.updates || []);

    // 4. Update Database
    let updatedCount = 0;
    for (const update of updates) {
      if (!update.task_id) continue;

      const payload: any = {};
      if (update.assigned_to) payload.assigned_to = update.assigned_to;
      if (update.blocked_by && Array.isArray(update.blocked_by)) payload.blocked_by = update.blocked_by;

      if (Object.keys(payload).length > 0) {
        await supabase.from('tasks').update(payload).eq('id', update.task_id);
        updatedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully orchestrated ${updatedCount} tasks.`,
      updates: updatedCount
    });

  } catch (error: any) {
    console.error('Orchestrator Error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
}
