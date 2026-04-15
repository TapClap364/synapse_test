// api/process-meeting.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios'; // Нам понадобится axios для отправки файла

export const config = {
  api: { bodyParser: false },
};

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const HF_TOKEN = process.env.HF_TOKEN;
// Используем мощную модель Whisper Large v3
const HF_MODEL_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Парсинг файла
    const form = formidable({});
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

    console.log("🎤 Start transcription via Hugging Face...");

    // 2. Отправка аудио в Hugging Face
    const audioBuffer = fs.readFileSync(audioFile.filepath);
    
    const hfResponse = await axios.post(HF_MODEL_URL, audioBuffer, {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "audio/webm", // или audio/mpeg, если формат другой
      },
      responseType: 'json',
    });

    // HF возвращает { text: "..." } или массив [{ text: "..." }]
    const fullText = Array.isArray(hfResponse.data) 
      ? hfResponse.data[0]?.text 
      : hfResponse.data.text;

    if (!fullText) throw new Error("Failed to transcribe audio");
    
    console.log("✅ Transcription done.");

    // 3. ИИ-Анализ (Здесь можно использовать бесплатную модель через OpenRouter, например Llama 3)
    // Для анализа текста нам нужен LLM. Если у тебя нет ключа OpenAI, используй OpenRouter с бесплатной моделью.
    // Но в этом примере я оставлю структуру под OpenRouter/Llama, которую мы уже настроили.
    
    // ВАЖНО: Если у тебя НЕТ ключа OpenAI вообще, раскомментируй код ниже для OpenRouter
    /*
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const analysisRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct", // Бесплатная или очень дешевая
            messages: [
                { role: "system", content: "Ты AI Secretary. Верни JSON: { summary: string, mind_map: object, tasks: [] }" },
                { role: "user", content: fullText }
            ],
            response_format: { type: "json_object" }
        })
    });
    const aiResult = (await analysisRes.json()).choices[0].message.content;
    */

    // Если у тебя ЕСТЬ ключ OpenAI (для GPT-4o-mini анализ дешевле цента), оставь как было:
  
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Manager",
  },
});
    // Для экономии я использую ту же логику, что и раньше, но ты можешь заменить на OpenRouter fetch выше
    const analysisCompletion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct", 
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

    // 4. Сохранение в БД
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

    // 5. Создание задач
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