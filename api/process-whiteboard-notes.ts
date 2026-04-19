/* eslint-disable @typescript-eslint/no-explicit-any */
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
  subtasks?: string[];
}

// Функция для нормализации текста (убираем лишние пробелы, приводим к нижнему регистру)
const normalizeText = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Функция для проверки схожести текстов
const isSimilarText = (text1: string, text2: string): boolean => {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  // Проверяем полное совпадение
  if (norm1 === norm2) return true;
  
  // Проверяем, содержится ли один текст в другом
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Проверяем схожесть (если разница в несколько символов)
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return maxLength > 0 && (distance / maxLength) < 0.2; // 20% порога различий
};

// Алгоритм Левенштейна для расчета расстояния между строками
const levenshteinDistance = (str1: string, str2: string): number => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null)
  );
  
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { notes } = req.body;
    
    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({ error: 'No notes provided' });
    }

    // ✅ Получаем ВСЕ существующие задачи для проверки на дубликаты
    const responseExistingTasks = await supabase
      .from('tasks')
      .select('id, title, description')
      .order('created_at', { ascending: false })
      .limit(100) as any;
    
    const existingTasks = responseExistingTasks.data || [];
    console.log('📋 Existing tasks:', existingTasks.length);

    const responseEpics = await supabase.from('epics').select('id, title') as any;
    const epics = responseEpics.data;
    const epicList = epics?.map((e: any) => e.title).join(', ') || 'General, Backend, Frontend, Design';

    const analysisCompletion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content: `Ты AI Project Manager. Проанализируй стикеры с брейншторма и создай структурированные задачи.
          
          Доступные эпики: [${epicList}]
          
          Верни СТРОГО JSON объект с ключом "tasks":
          {
            "tasks": [
              {
                "title": "Заголовок задачи",
                "description": "Описание",
                "priority": "low" | "medium" | "high" | "critical",
                "epic_title": "Название эпика",
                "estimated_hours": number,
                "blocked_by": number[],
                "subtasks": string[]
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
    const tasks: TaskInput[] = Array.isArray(aiResult.tasks) ? aiResult.tasks : [];

    const createdTasks: any[] = [];
    const skippedNotes: string[] = [];

    for (const task of tasks) {
      // ✅ ПРОВЕРКА НА ДУБЛИКАТЫ
      const isDuplicate = existingTasks.some((existingTask: { id: number; title: string; description: string }) => {
        // Проверяем схожесть заголовка
        const titleSimilar = isSimilarText(task.title, existingTask.title);
        
        // Проверяем схожесть описания (если есть)
        const descSimilar = task.description && existingTask.description 
          ? isSimilarText(task.description, existingTask.description)
          : false;
        
        return titleSimilar || descSimilar;
      });

      if (isDuplicate) {
        console.log('️ Skipping duplicate task:', task.title);
        skippedNotes.push(task.title);
        continue; // Пропускаем создание дубликата
      }

      // Создание эпика если нужно
      let epicId = null;
      const foundEpic = epics?.find((e: any) => 
        e.title.toLowerCase().includes(task.epic_title?.toLowerCase()) ||
        task.epic_title?.toLowerCase().includes(e.title.toLowerCase())
      );
      
      if (foundEpic) {
        epicId = foundEpic.id;
      } else if (task.epic_title) {
        const responseNewEpic = await supabase
          .from('epics')
          .insert({ title: task.epic_title })
          .select()
          .single() as any;
        
        const newEpic = responseNewEpic.data;
        if (newEpic) {
          epicId = newEpic.id;
        }
      }

      // Создание задачи
      const responseTask = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: `${task.description} (С whiteboard)\n\n### Подзадачи (AI):\n${task.subtasks?.map((s: string) => `- [ ] ${s}`).join('\n') || ''}`,
          priority: task.priority || 'medium',
          estimated_hours: task.estimated_hours || 4,
          status: 'backlog',
          epic_id: epicId,
          blocked_by: task.blocked_by || []
        })
        .select()
        .single() as any;

      const newTask = responseTask.data;
      const taskError = responseTask.error;

      if (!taskError && newTask) {
        createdTasks.push(newTask);
        console.log('✅ Created task:', task.title);
      }
    }

    // Формируем сообщение с учетом пропущенных дубликатов
    let message = `Создано ${createdTasks.length} задач`;
    if (skippedNotes.length > 0) {
      message += ` (пропущено ${skippedNotes.length} дубликатов)`;
    }

    return res.status(200).json({
      message,
      tasks: createdTasks,
      skipped: skippedNotes
    });

  } catch (error: any) {
    console.error("Whiteboard processing error:", error);
    return res.status(500).json({ error: error.message });
  }
}