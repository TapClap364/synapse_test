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
    // 1. Получаем контекст: Эпики и последние задачи
    // Используем as any для обхода строгих типов TS в Vercel
    const responseEpics = await supabase.from('epics').select('id, title') as any;
    const epics = responseEpics.data;
    
    const epicList = epics?.map((e: any) => e.title).join(', ') || 'General, Backend, Frontend, Design, Marketing';

    // Берем последние 5 задач для анализа зависимостей
    const responseTasks = await supabase
      .from('tasks')
      .select('id, title, status, epic_id')
      .order('created_at', { ascending: false })
      .limit(5) as any;
    const recentTasks = responseTasks.data;

    const taskContext = recentTasks?.map((t: any) => `ID:${t.id} [${t.status}] "${t.title}"`).join('\n') || 'Нет существующих задач';

    // 2. Запрос к OpenRouter (Структурирование + Зависимости + Эпик)
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct", 
      messages: [
        {
          role: "system",
          content: `Ты Lead Project Manager. 
          Твоя задача: проанализировать голосовое сообщение и создать задачу.
          
          ВАЖНО:
          1. Определи зависимости (blocked_by). Если новая задача логически не может начаться БЕЗ завершения одной из существующих задач, укажи её ID в массиве blocked_by.
          2. Выбери подходящий эпик из списка или предложи новый.
          
          Доступные Эпики: [${epicList}]
          Существующие задачи (контекст):
          ${taskContext}

          Верни СТРОГО JSON объект:
          {
            "title": "Короткий заголовок",
            "description": "Подробное описание",
            "priority": "low" | "medium" | "high" | "critical",
            "epic_title": "Название эпика (выбери из списка или создай новый)",
            "estimated_hours": number,
            "blocked_by": number[] // Массив ID задач-предшественников. Если нет, верни []
          }`
        },
        { role: "user", content: voice_text }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Пустой ответ от ИИ");

    const aiData = JSON.parse(content);

    // 3. Логика поиска или создания Эпика (УЛУЧШЕНО: гибкий поиск)
    let epicId: number | null = null;
    
    // Гибкий поиск: игнорируем регистр и лишние пробелы
    const existingEpic = epics?.find(
      (e: any) => e.title.toLowerCase().trim().includes(aiData.epic_title.toLowerCase().trim()) ||
                  aiData.epic_title.toLowerCase().trim().includes(e.title.toLowerCase().trim())
    );

    if (existingEpic) {
      epicId = existingEpic.id;
    } else {
      // Создаем новый эпик, если не нашли
      const responseNewEpic = await supabase
        .from('epics')
        .insert({ title: aiData.epic_title })
        .select()
        .single() as any;
      
      const newEpic = responseNewEpic.data;
      const epicError = responseNewEpic.error;
      
      if (epicError || !newEpic) throw new Error(`Failed to create epic: ${epicError?.message}`);
      epicId = newEpic.id;
    }

    // 4. Создание задачи в Supabase с зависимостями
    const responseTask = await supabase
      .from('tasks')
      .insert({
        title: aiData.title,
        description: aiData.description,
        priority: aiData.priority,
        estimated_hours: aiData.estimated_hours,
        epic_id: epicId,
        status: 'backlog',
        blocked_by: aiData.blocked_by || [], // Сохраняем зависимости
        board_x: Math.random() * 800,
        board_y: Math.random() * 600
      })
      .select()
      .single() as any;

    const task = responseTask.data;
    const taskError = responseTask.error;

    if (taskError || !task) throw new Error(`Failed to create task: ${taskError?.message}`);

    return res.status(200).json(task);

  } catch (error: any) {
    console.error('Synapse API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}