// api/process-whiteboard-notes.ts
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

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface TaskInput {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  epic_title: string;
  estimated_hours: number;
  blocked_by?: number[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { notes } = req.body;
    
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({ error: 'No notes provided' });
    }

    // Получаем существующие эпики
    const {  epics } = await supabase.from('epics').select('id, title') as any;
    const epicList = epics?.map((e: any) => e.title).join(', ') || 'General, Backend, Frontend, Design';

    // ИИ анализирует стикеры
    const analysisCompletion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content: `Ты AI Project Manager. Проанализируй стикеры с брейншторма и создай структурированные задачи.
          
          Доступные эпики: [${epicList}]
          
          Верни СТРОГО JSON объект с ключом "tasks", содержащим массив:
          {
            "tasks": [
              {
                "title": "Заголовок задачи",
                "description": "Описание",
                "priority": "low" | "medium" | "high" | "critical",
                "epic_title": "Название эпика",
                "estimated_hours": number,
                "blocked_by": number[]
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Стикеры с доски:\n${notes.join('\n')}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiResult = JSON.parse(analysisCompletion.choices[0].message.content || '{}');
    // Явно приводим тип, чтобы избежать ошибки TS2345
    const tasks: TaskInput[] = Array.isArray(aiResult.tasks) ? aiResult.tasks : [];

    // Создаём задачи в базе
    const createdTasks = [];
    for (const task of tasks) {
      // Найти или создать эпик
      let epicId = null;
      const foundEpic = epics?.find((e: any) => 
        e.title.toLowerCase().includes(task.epic_title?.toLowerCase()) ||
        task.epic_title?.toLowerCase().includes(e.title.toLowerCase())
      );
      
      if (foundEpic) {
        epicId = foundEpic.id;
      } else if (task.epic_title) {
        const {  newEpic } = await supabase
          .from('epics')
          .insert({ title: task.epic_title })
          .select()
          .single() as any;
        epicId = newEpic?.id;
      }

      const {  newTask } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: `${task.description} (С whiteboard)`,
          priority: task.priority || 'medium',
          estimated_hours: task.estimated_hours || 4,
          status: 'backlog',
          epic_id: epicId,
          blocked_by: task.blocked_by || []
        })
        .select()
        .single() as any;

      if (newTask) createdTasks.push(newTask);
    }

    return res.status(200).json({
      message: `Создано ${createdTasks.length} задач`,
      tasks: createdTasks
    });

  } catch (error: any) {
    console.error("Whiteboard processing error:", error);
    return res.status(500).json({ error: error.message });
  }
}