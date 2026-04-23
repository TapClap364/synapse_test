import { z } from 'zod';
import { createHandler } from './_lib/handler';
import { getOpenAI, AI_MODEL } from './_lib/openai';

const InputSchema = z.object({
  text: z.string().min(20).max(20_000),
});

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai' },
  async ({ body, res }) => {
    const systemPrompt = `You are an HR Specialist and AI Analyst.
Analyze the provided Job Description (JD) and extract the core responsibilities, skills, and functions of this employee.
Format the output as a concise 1-paragraph summary (in RUSSIAN) that Synapse AI can use to assign tasks.

Focus on:
- What this person DOES.
- What technologies or tools they use.
- What their primary responsibilities are.

JD Content:
${body.text.slice(0, 5000)}`;

    const response = await getOpenAI().chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.3,
    });

    res.status(200).json({
      success: true,
      extracted_role: response.choices[0]?.message?.content ?? '',
    });
  }
);
