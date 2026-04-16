// api/ai-ocr.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI OCR",
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { fileUrl, action = 'extract' } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    console.log('🚀 Starting OCR with Qwen-VL for:', fileUrl);

    // Используем Qwen-VL как основную модель. 
    // Она отлично понимает PDF и изображения через image_url.
    const response = await openai.chat.completions.create({
      model: "qwen/qwen3-vl-8b-instruct", // Твоя рабочая модель
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: action === 'table' 
                ? "Extract ALL tables from this document. Return strictly as HTML <table> code. Do not add markdown blocks or explanations."
                : "Extract all text from this document. Preserve original structure, line breaks, and formatting. Return clean text."
            },
            { 
              type: "image_url", // OpenRouter требует этот формат
              image_url: { url: fileUrl } 
            }
          ]
        }
      ],
      max_tokens: 8192,
      temperature: 0.1
    });

    const result = response.choices[0].message.content;
    console.log('✅ Qwen OCR Success');
    
    return res.status(200).json({ result });

  } catch (error: any) {
    console.error("❌ OCR Error:", error);
    return res.status(500).json({ error: error.message });
  }
}