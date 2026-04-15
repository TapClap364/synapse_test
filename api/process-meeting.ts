// api/process-meeting.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import axios from 'axios';
import OpenAI from 'openai';

export const config = { api: { bodyParser: false } };

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3";

// Инициализация OpenAI (или OpenRouter) для анализа текста
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
  ...(process.env.OPENROUTER_API_KEY ? { baseURL: "https://openrouter.ai/api/v1" } : {})
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
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

    console.log("🎤 Transcribing via Hugging Face...");
    const audioBuffer = fs.readFileSync(audioFile.filepath);

    const hfResponse = await axios.post(HF_MODEL_URL, audioBuffer, {
      headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "audio/webm" },
      responseType: 'json',
    });

    const fullText = Array.isArray(hfResponse.data) ? hfResponse.data[0]?.text : hfResponse.data.text;
    if (!fullText) throw new Error("Failed to transcribe audio");

    console.log("✅ Transcription done.");

    const analysisCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: `Ты AI Secretary. Проанализируй транскрипцию. Верни JSON: { summary: string, mind_map: { label: string, children: any[] }, tasks: [{ title: string, description: string, priority: "low"|"medium"|"high", estimated_hours: number }] }` },
        { role: "user", content: fullText }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(analysisCompletion.choices[0].message.content || '{}');

    const responseMeeting = await supabase
      .from('meetings')
      .insert({ title: fields.title?.[0] || `Meeting ${new Date().toLocaleTimeString()}`, summary: aiResult.summary, mind_map_data: aiResult.mind_map })
      .select()
      .single() as any;

    if (responseMeeting.error) throw responseMeeting.error;

    let tasksCreatedCount = 0;
    if (aiResult.tasks && Array.isArray(aiResult.tasks)) {
      for (const task of aiResult.tasks) {
        await supabase.from('tasks').insert({
          title: task.title, description: `${task.description} (Из встречи)`, priority: task.priority || 'medium',
          estimated_hours: task.estimated_hours || 2, status: 'backlog', blocked_by: [], epic_id: null
        });
        tasksCreatedCount++;
      }
    }

    try { fs.unlinkSync(audioFile.filepath); } catch {}

    return res.status(200).json({ message: "Meeting processed", summary: aiResult.summary, mindMap: aiResult.mind_map, tasksCreated: tasksCreatedCount });
  } catch (error: any) {
    console.error("Meeting error:", error);
    return res.status(500).json({ error: error.message });
  }
}