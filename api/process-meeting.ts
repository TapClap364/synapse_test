// api/process-meeting.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const openai = new OpenAI({ 
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, title } = req.body;
    if (!text || text.trim().length < 10) return res.status(400).json({ error: 'Text is too short' });

    // 1. Получаем существующие эпики для контекста
    const {  existingEpics } = await supabase.from('epics').select('id, title') as any;
    const epicList = existingEpics?.map((e: any) => e.title).join(', ') || 'General, Backend, Frontend, Design, Marketing';

    // 2. ИИ-Анализ с привязкой к эпикам
    const analysisCompletion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_API_KEY ? "meta-llama/llama-3.3-70b-instruct" : "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты AI Secretary & Project Manager. Проанализируй текст встречи.
          Доступные эпики: [${epicList}]
          Верни СТРОГО JSON:
          {
            "summary": "Краткое резюме (3-5 предложений)",
            "mind_map": { "label": "Главная тема", "children": [ { "label": "Ветка 1", "children": [] } ] },
            "tasks": [
              { 
                "title": "Задача", 
                "description": "Описание", 
                "priority": "low"|"medium"|"high", 
                "estimated_hours": number,
                "epic_title": "Название подходящего эпика из списка или создай новый"
              }
            ]
          }`
        },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(analysisCompletion.choices[0].message.content || '{}');

    // 3. Сохранение встречи
    const responseMeeting = await supabase
      .from('meetings')
      .insert({ title: title || `Meeting ${new Date().toLocaleTimeString()}`, summary: aiResult.summary, mind_map_ aiResult.mind_map })
      .select()
      .single() as any;
    if (responseMeeting.error) throw responseMeeting.error;

    // 4. Создание задач с правильным распределением по эпикам
    let tasksCreatedCount = 0;
    if (aiResult.tasks && Array.isArray(aiResult.tasks)) {
      for (const task of aiResult.tasks) {
        // Найти или создать эпик
        let epicId = null;
        const foundEpic = existingEpics?.find((e: any) => e.title.toLowerCase().includes(task.epic_title.toLowerCase()));
        if (foundEpic) {
          epicId = foundEpic.id;
        } else {
          const {  newEpic } = await supabase.from('epics').insert({ title: task.epic_title }).select().single() as any;
          epicId = newEpic?.id;
        }

        await supabase.from('tasks').insert({
          title: task.title,
          description: `${task.description} (Из встречи)`,
          priority: task.priority || 'medium',
          estimated_hours: task.estimated_hours || 2,
          status: 'backlog',
          blocked_by: [],
          epic_id: epicId
        });
        tasksCreatedCount++;
      }
    }

    return res.status(200).json({ 
      message: "Meeting processed", 
      summary: aiResult.summary,
      mindMap: aiResult.mind_map,
      tasksCreated: tasksCreatedCount
    });

  } catch (error: any) {
    console.error("Meeting processing error:", error);
    return res.status(500).json({ error: error.message });
  }
}