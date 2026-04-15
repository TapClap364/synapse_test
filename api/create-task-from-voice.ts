// api/create-task-from-voice.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// 1. Инициализация OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Manager",
  },
});

// 2. Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { voice_text } = req.body;

  if (!voice_text) {
    return res.status(400).json({ error: 'Voice text is required' });
  }

  try {
    // 1. Получаем список эпиков
    // Используем стандартную деструктуризацию { data, error }
    const { data: epics, error: epicsError } = await supabase
      .from('epics')
      .select('id, title');
    
    if (epicsError) throw epicsError;

    const epicList = epics?.map((e: any) => e.title).join(', ') || 'General, Backend, Frontend, Design';

    // 2. Запрос к OpenRouter
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct", 
      messages: [
        {
          role: "system",
          content: `Ты опытный Project Manager (AI Agent). 
          Твоя задача: проанализировать голосовое сообщение пользователя и превратить его в структурированную задачу.
          
          Доступные Эпики (категории): [${epicList}]
          
          Правила:
          1. Выбери наиболее подходящий эпик из списка. Если ничего не подходит, предложи новое название эпика.
          2. Оцени приоритет: 'low' | 'medium' | 'high' | 'critical'.
          3. Оцени время в часах (estimated_hours).
          
          Верни СТРОГО JSON объект без markdown-оберток:
          {
            "title": "Короткий заголовок",
            "description": "Подробное описание",
            "priority": "low" | "medium" | "high" | "critical",
            "epic_title": "Название эпика",
            "estimated_hours": number
          }`
        },
        { role: "user", content: voice_text }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Пустой ответ от ИИ");

    const aiData = JSON.parse(content);

    // 3. Логика поиска или создания Эпика
    let epicId: number | null = null;
    
    // Безопасный поиск эпика
    const existingEpic = epics?.find(
      (e: any) => e.title.toLowerCase().trim() === aiData.epic_title.toLowerCase().trim()
    );

    if (existingEpic) {
      epicId = existingEpic.id;
    } else {
      // Создаем новый эпик
      // Важно: используем { data: newEpic, error: epicError }
      const { data: newEpic, error: epicError } = await supabase
        .from('epics')
        .insert({ title: aiData.epic_title })
        .select()
        .single();
      
      if (epicError || !newEpic) throw new Error(`Failed to create epic: ${epicError?.message}`);
      epicId = newEpic.id;
    }

    // 4. Создание задачи в Supabase
    // Важно: используем { data: task, error: taskError }
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: aiData.title,
        description: aiData.description,
        priority: aiData.priority,
        estimated_hours: aiData.estimated_hours,
        epic_id: epicId,
        status: 'backlog',
        board_x: Math.random() * 800,
        board_y: Math.random() * 600
      })
      .select()
      .single();

    if (taskError || !task) throw new Error(`Failed to create task: ${taskError?.message}`);

    return res.status(200).json(task);

  } catch (error: any) {
    console.error('Synapse API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}