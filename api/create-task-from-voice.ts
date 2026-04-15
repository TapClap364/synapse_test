// api/create-task-from-voice.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Manager",
  },
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { return res.status(405).json({ error: 'Method not allowed' }); }

  const { voice_text } = req.body;
  if (!voice_text) return res.status(400).json({ error: 'Voice text is required' });

  try {
    // 1. Получаем контекст: Эпики и последние задачи
    const {  epics } = await supabase.from('epics').select('id, title');
    const epicList = epics?.map(e => e.title).join(', ') || 'General';
    
    // Берем последние 5 задач для анализа зависимостей
    const {  recentTasks } = await supabase
      .from('tasks')
      .select('id, title, status, epic_id')
      .order('created_at', { ascending: false })
      .limit(5);

    const taskContext = recentTasks?.map(t => `ID:${t.id} [${t.status}] "${t.title}"`).join('\n') || 'Нет задач';

    // 2. AI Agent: Структурирование + Анализ зависимостей
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content: `Ты Lead Project Manager. 
          1. Структурируй задачу из голоса.
          2. Определи зависимости (blocked_by). Если новая задача логически не может начаться без выполнения одной из существующих задач (например, "Крыша" после "Стен"), укажи ID той задачи в массиве blocked_by.
          
          Доступные Эпики: [${epicList}]
          Существующие задачи:
          ${taskContext}

          Верни JSON:
          {
            "title": "string",
            "description": "string",
            "priority": "low"|"medium"|"high"|"critical",
            "epic_title": "string",
            "estimated_hours": number,
            "blocked_by": number[] // Массив ID задач, которые блокируют эту. Если нет, то []
          }`
        },
        { role: "user", content: voice_text }
      ],
      response_format: { type: "json_object" }
    });

    const aiData = JSON.parse(completion.choices[0].message.content || '{}');

    // 3. Поиск/Создание Эпика
    let epicId = null;
    const existingEpic = epics?.find(e => e.title.toLowerCase() === aiData.epic_title.toLowerCase());
    if (existingEpic) {
      epicId = existingEpic.id;
    } else {
      const {  newEpic } = await supabase.from('epics').insert({ title: aiData.epic_title }).select().single();
      epicId = newEpic?.id;
    }

    // 4. Создание задачи с зависимостями
    const {  task, error } = await supabase
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
      .single();

    if (error) throw error;
    return res.status(200).json(task);

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}