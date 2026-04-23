import { z } from 'zod';
import { createHandler } from './_lib/handler';
import { getOpenAI } from './_lib/openai';
import { HttpError } from './_lib/errors';

const InputSchema = z.object({
  fileUrl: z.string().url().max(2_000),
  action: z.enum(['extract', 'table']).optional().default('extract'),
});

const OCR_MODEL = 'qwen/qwen3-vl-235b-a22b-instruct';

export default createHandler(
  { method: 'POST', schema: InputSchema, rateLimit: 'ai', requireWrite: true },
  async ({ body, res }) => {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new HttpError(500, 'OCR requires OPENROUTER_API_KEY (Qwen-VL)');
    }

    const response = await getOpenAI().chat.completions.create({
      model: OCR_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                body.action === 'table'
                  ? 'Extract ALL tables from this document. Return strictly as HTML <table> code. Do not add markdown blocks or explanations.'
                  : 'Extract all text from this document. Preserve original structure, line breaks, and formatting. Return clean text.',
            },
            { type: 'image_url', image_url: { url: body.fileUrl } },
          ],
        },
      ],
      max_tokens: 8192,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content ?? '';
    res.status(200).json({ result });
  }
);
