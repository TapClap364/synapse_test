import { z } from 'zod';
import { createHandler } from './_lib/handler';
import { getOpenAI, AI_MODEL } from './_lib/openai';

const ACTIONS = [
  'improve',
  'table',
  'summary',
  'tasks',
  'continue',
  'translate',
  'parse_job_description',
] as const;

const InputSchema = z.object({
  text: z.string().min(1).max(20_000),
  action: z.enum(ACTIONS),
});

const PROMPTS: Record<(typeof ACTIONS)[number], string> = {
  improve:
    'Ты профессиональный редактор. Улучши стиль, исправь ошибки, сделай текст более четким и деловым. Верни только результат.',
  table:
    'Ты аналитик данных. Преврати этот текст в HTML таблицу (<table>...). Если в тексте есть структура (списки, данные), выдели их в столбцы. Верни ТОЛЬКО HTML код таблицы, без пояснений.',
  summary:
    'Сделай краткое содержание (Summary) этого текста. Выдели 3-5 главных пунктов в виде списка. Верни HTML список (<ul><li>...</li></ul>).',
  tasks:
    'Извлеки из текста список задач. Верни их в виде HTML списка задач с чекбоксами (используй <input type="checkbox">).',
  continue:
    'Ты соавтор документа. Продолжи мысль, сохраняя стиль и контекст текста. Напиши 1-2 абзаца логичного продолжения. Верни ТОЛЬКО HTML текст продолжения, без вводных слов.',
  translate:
    'Переведи текст на английский язык (если он на русском) или на русский язык (если он на английском). Верни ТОЛЬКО HTML текст перевода, без пояснений.',
  parse_job_description:
    'Ты HR-аналитик. Проанализируй Job Description и извлеки основные обязанности, навыки и функции сотрудника. Верни КРАТКОЕ резюме одним абзацем на русском языке, которое Synapse AI сможет использовать для распределения задач. Сфокусируйся на: что человек ДЕЛАЕТ, какие технологии/инструменты использует, основные обязанности.',
};

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai' },
  async ({ body, res }) => {
    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: PROMPTS[body.action] },
        { role: 'user', content: body.text.slice(0, 5000) },
      ],
      temperature: body.action === 'parse_job_description' ? 0.3 : undefined,
    });

    res.status(200).json({ result: completion.choices[0]?.message?.content ?? '' });
  }
);
