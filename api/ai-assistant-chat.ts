/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Assistant",
  },
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [] } = req.body;

  try {
    // 1. Собираем контекст проекта
    const { data: tasks } = await supabase.from('tasks').select('title, status, priority').limit(50);
    const { data: docs } = await supabase.from('documents').select('title, content').limit(10);
    const { data: meetings } = await supabase.from('meetings').select('title, summary').limit(5);

    const context = `
Задачи: ${tasks?.map(t => `[${t.status}] ${t.title}`).join(', ') || 'Нет'}
Документация: ${docs?.map(d => d.title).join(', ') || 'Нет'}
Последние встречи: ${meetings?.map(m => m.title).join(', ') || 'Нет'}
    `;

    // 2. Запрос к ИИ
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content: `Ты Synapse AI Assistant — умный помощник по управлению проектами. 
          Твоя цель: помогать пользователю ориентироваться в его задачах и документах.
          
          Контекст текущего проекта:
          ${context}
          
          Будь кратким, профессиональным и полезным. Если пользователь спрашивает о конкретных задачах, используй контекст выше.`
        },
        ...history,
        { role: "user", content: message }
      ],
    });

    const reply = completion.choices[0].message.content;
    return res.status(200).json({ reply });

  } catch (error: any) {
    console.error("AI Assistant Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
