// api/process-meeting.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

// Отключаем стандартный парсер body, чтобы работать с FormData (файлами)
export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Парсинг загруженного файла
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    // Получаем первый аудиофайл
    const audioFile = files.audio?.[0];
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log("🎤 Start transcription...");

    // 2. Транскрибация через Whisper (OpenAI)
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: "whisper-1",
      language: "ru" // Можно убрать, если встречи на разных языках
    });

    const fullText = transcription.text;
    console.log("✅ Transcription done. Length:", fullText.length);

    // 3. ИИ-Анализ: Summary + Mind Map + Tasks
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
        { role: "user", content: fullText }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(analysisCompletion.choices[0].message.content || '{}');

    // 4. Сохранение Meeting Notes в БД
    // ИСПРАВЛЕНО: используем { data: meeting }
    const {  meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title: fields.title?.[0] || `Meeting ${new Date().toLocaleTimeString()}`,
        summary: aiResult.summary,
        mind_map_data: aiResult.mind_map
      })
      .select()
      .single();

    if (meetingError) throw meetingError;

    // 5. Создание задач в основном бэклоге
    let tasksCreatedCount = 0;
    if (aiResult.tasks && aiResult.tasks.length > 0) {
      for (const task of aiResult.tasks) {
         await supabase.from('tasks').insert({
           title: task.title,
           description: `${task.description} (Source: Meeting)`,
           priority: task.priority || 'medium',
           estimated_hours: task.estimated_hours || 2,
           status: 'backlog',
           blocked_by: [],
           epic_id: null
         });
         tasksCreatedCount++;
      }
    }

    // Удаляем временный файл
    fs.unlinkSync(audioFile.filepath);

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