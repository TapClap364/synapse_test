// api/process-meeting.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Инициализация через OpenRouter (бесплатные модели) или OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, title } = req.body;
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'Text is too short' });
    }

    console.log("🧠 Analyzing meeting text...");

    // ИИ-Анализ: Summary + Mind Map + Tasks
    const analysisCompletion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_API_KEY ? "meta-llama/llama-3.3-70b-instruct" : "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты AI Secretary. Проанализируй текст встречи.
          Верни СТРОГО JSON объект:
          {
            "summary": "Краткое резюме встречи (3-5 предложений)",
            "mind_map": {
              "label": "Главная тема",
              "children": [
                { "label": "Подтема 1", "children": [] }
              ]
            },
            "tasks": [
              {
                "title": "Задача",
                "description": "Описание",
                "priority": "low" | "medium" | "high",
                "estimated_hours": number
              }
            ]
          }`
        },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(analysisCompletion.choices[0].message.content || '{}');

    // Сохранение Meeting Notes в БД
    const responseMeeting = await supabase
      .from('meetings')
      .insert({
        title: title || `Meeting ${new Date().toLocaleTimeString()}`,
        summary: aiResult.summary,
        mind_map_data: aiResult.mind_map
      })
      .select()
      .single() as any;

    if (responseMeeting.error) throw responseMeeting.error;

    // Создание задач в основном бэклоге
    let tasksCreatedCount = 0;
    if (aiResult.tasks && Array.isArray(aiResult.tasks)) {
      for (const task of aiResult.tasks) {
         await supabase.from('tasks').insert({
           title: task.title,
           description: `${task.description} (Из встречи)`,
           priority: task.priority || 'medium',
           estimated_hours: task.estimated_hours || 2,
           status: 'backlog',
           blocked_by: [],
           epic_id: null
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