// api/process-meeting.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};// 1. Инициализация OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Manager",
  },
});


const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const form = formidable({});
    
    // Безопасный Promise с явным типом any, чтобы избежать ошибки TS2488
    const { fields, files } = await new Promise<any>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const audioFile = files.audio?.[0]; 
    if (!audioFile || !audioFile.filepath) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log("🎤 Start transcription...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: "whisper-1",
      language: "ru"
    });

    const fullText = transcription.text;
    console.log("✅ Transcription done.");

    console.log("🧠 Analyzing content...");
    const analysisCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Ты AI Secretary. Проанализируй транскрипцию встречи.
          Верни СТРОГО JSON объект:
          {
            "summary": "Краткое резюме встречи (3-5 предложений)",
            "mind_map": { "label": "Главная тема", "children": [] },
            "tasks": [{ "title": "Задача", "description": "Описание", "priority": "low" | "medium" | "high", "estimated_hours": number }]
          }`
        },
        { role: "user", content: fullText }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(analysisCompletion.choices[0].message.content || '{}');

    // Сохранение в БД (используем as any для обхода строгих типов Supabase)
    const responseMeeting = await supabase
      .from('meetings')
      .insert({
        title: fields.title?.[0] || `Meeting ${new Date().toLocaleTimeString()}`,
        summary: aiResult.summary,
        mind_map_data: aiResult.mind_map
      })
      .select()
      .single() as any;

    if (responseMeeting.error) throw responseMeeting.error;

    // Создание задач
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

    // Очистка временного файла
    try { fs.unlinkSync(audioFile.filepath); } catch (e) {}

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