/* eslint-disable @typescript-eslint/no-explicit-any */
// api/wiki-ai-action.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Manager",
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, action } = req.body;

    if (!text || !action) {
      return res.status(400).json({ error: 'Text and action are required' });
    }

    let systemPrompt = '';

    switch (action) {
      case 'improve':
        systemPrompt = 'Ты профессиональный редактор. Улучши стиль, исправь ошибки, сделай текст более четким и деловым. Верни только результат.';
        break;
      case 'table':
        systemPrompt = 'Ты аналитик данных. Преврати этот текст в HTML таблицу (<table>...). Если в тексте есть структура (списки, данные), выдели их в столбцы. Верни ТОЛЬКО HTML код таблицы, без пояснений.';
        break;
      case 'summary':
        systemPrompt = 'Сделай краткое содержание (Summary) этого текста. Выдели 3-5 главных пунктов в виде списка. Верни HTML список (<ul><li>...).</li></ul>).';
        break;
      case 'tasks':
        systemPrompt = 'Извлеки из текста список задач. Верни их в виде HTML списка задач с чекбоксами (используй <input type="checkbox">).';
        break;
      case 'continue':
        systemPrompt = 'Ты соавтор документа. Продолжи мысль, сохраняя стиль и контекст текста. Напиши 1-2 абзаца логичного продолжения. Верни ТОЛЬКО HTML текст продолжения, без вводных слов.';
        break;
      case 'translate':
        systemPrompt = 'Переведи текст на английский язык (если он на русском) или на русский язык (если он на английском). Верни ТОЛЬКО HTML текст перевода, без пояснений.';
        break;
      default:
        systemPrompt = 'Выполни запрос пользователя.';
    }

    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
    });

    const result = completion.choices[0].message.content;
    return res.status(200).json({ result });

  } catch (error: any) {
    console.error("Wiki AI Action Error:", error);
    return res.status(500).json({ error: error.message });
  }
}