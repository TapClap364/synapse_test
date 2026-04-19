/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Comment Helper",
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { task_title, task_description, comments = [] } = req.body;

  try {
    const context = `
Задача: ${task_title}
Описание: ${task_description}
Последние комментарии:
${comments.map((c: any) => `${c.profile?.full_name || 'User'}: ${c.content}`).join('\n')}
    `;

    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        {
          role: "system",
          content: `Ты помощник в обсуждении задач. Проанализируй контекст и предложи 3 коротких варианта ответа или следующее действие.
          Верни СТРОГО JSON: { "suggestions": ["Вариант 1", "Вариант 2", "Вариант 3"] }`
        },
        { role: "user", content: context }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"suggestions": []}');
    return res.status(200).json(result);

  } catch (error: any) {
    console.error("AI Comment Helper Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
