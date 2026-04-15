// api/process-meeting.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

// Инициализация
const openai = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY }); // Нужен ключ OpenAI для Whisper
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Отключаем парсинг тела запроса по умолчанию для обработки FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Парсинг загруженного файла
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const audioFile = files.audio?.[0];

    if (!audioFile) return res.status(400).json({ error: 'No audio file provided' });

    // 2. Транскрибация (Whisper)
    console.log("🎤 Transcribing audio...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: "whisper-1",
      language: "ru" 
    });

    const fullText = transcription.text;
    console.log("✅ Transcription complete. Length:", fullText.length);

    // 3. ИИ-Анализ: Summary + Mind Map + Tasks
    console.log("🧠 Analyzing meeting content...");
    const analysisCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Или llama-3.3 через OpenRouter, если хочешь сэкономить
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
                { "label": "Подтема 1", "children": [] },
                { "label": "Подтема 2", "children": [ { "label": "Деталь", "children": [] } ] }
              ]
            },
            "tasks": [
              {
                "title": "Задача",
                "description": "Описание",
                "assignee": "Имя (если упомянуто)",
                "priority": "low|medium|high",
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
    const {  meeting } = await supabase
      .from('meetings')
      .insert({
        title: fields.title?.[0] || "Без названия",
        summary: aiResult.summary,
        mind_map_data: aiResult.mind_map
      })
      .select()
      .single();

    // 5. Создание задач в основном бэклоге (интеграция с существующей логикой)
    if (aiResult.tasks && aiResult.tasks.length > 0) {
      // Здесь мы могли бы вызвать ту же логику, что и в create-task-from-voice
      // Но для простоты создадим их напрямую
      for (const task of aiResult.tasks) {
         // Упрощенное создание без поиска эпика для демо
         await supabase.from('tasks').insert({
           title: task.title,
           description: `${task.description} (Из встречи: ${meeting.title})`,
           priority: task.priority || 'medium',
           estimated_hours: task.estimated_hours || 2,
           status: 'backlog',
           blocked_by: []
         });
      }
    }

    // Удаляем временный файл
    fs.unlinkSync(audioFile.filepath);

    return res.status(200).json({ 
      message: "Meeting processed", 
      summary: aiResult.summary,
      mindMap: aiResult.mind_map,
      tasksCreated: aiResult.tasks?.length || 0
    });

  } catch (error: any) {
    console.error("Meeting processing error:", error);
    return res.status(500).json({ error: error.message });
  }
}