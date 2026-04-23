import { z } from 'zod';
import { createHandler } from './_lib/handler';
import { getServiceSupabase } from './_lib/supabase';
import { getOpenAI, AI_MODEL } from './_lib/openai';

const HistoryMessage = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(8_000),
});

const InputSchema = z.object({
  message: z.string().min(1).max(4_000),
  history: z.array(HistoryMessage).max(20).optional().default([]),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai' },
  async ({ auth, body, res }) => {
    const supabase = getServiceSupabase();

    const [tasks, docs, meetings] = await Promise.all([
      supabase.from('tasks').select('title, status, priority').eq('workspace_id', auth.workspaceId).limit(50),
      supabase.from('documents').select('title').eq('workspace_id', auth.workspaceId).limit(10),
      supabase.from('meetings').select('title, summary').eq('workspace_id', auth.workspaceId).limit(5),
    ]);

    const context = `
Задачи: ${tasks.data?.map((t) => `[${t.status}] ${t.title}`).join(', ') || 'Нет'}
Документация: ${docs.data?.map((d) => d.title).join(', ') || 'Нет'}
Последние встречи: ${meetings.data?.map((m) => m.title).join(', ') || 'Нет'}
    `.trim();

    const completion = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: 'system',
          content: `Ты Synapse AI Assistant — умный помощник по управлению проектами.
Твоя цель: помогать пользователю ориентироваться в его задачах и документах.

Контекст текущего workspace:
${context}

Будь кратким, профессиональным и полезным. Если пользователь спрашивает о конкретных задачах, используй контекст выше.`,
        },
        ...body.history,
        { role: 'user', content: body.message },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    res.status(200).json({ reply });
  }
);
