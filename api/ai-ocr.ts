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

    console.log('🚀 Starting OCR for:', fileUrl);

    // 1. Пытаемся использовать Gemini (он умеет читать PDF)
    // Важно: для OpenRouter всегда используем "image_url", даже для PDF
    try {
      const response = await openai.chat.completions.create({
        model: "qwen/qwen3-vl-235b-a22b-instruct", // Стандартное имя модели на OpenRouter
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: action === 'table' 
                  ? "Extract ALL tables from this document. Return strictly as HTML <table> code."
                  : "Extract all text from this document. Keep formatting."
              },
              { 
                type: "image_url", // <--- FIX: Всегда image_url для OpenRouter
                image_url: { url: fileUrl } 
              }
            ]
          }
        ],
        max_tokens: 8192,
        temperature: 0.1
      });

      const result = response.choices[0].message.content;
      console.log('✅ Success with Gemini');
      return res.status(200).json({ result });

    } catch (geminiError: any) {
      console.warn('⚠️ Gemini failed, trying fallback...', geminiError.message);
      
      // 2. Фоллбэк на GPT-4o (работает только с картинками, не с PDF)
      // Если это PDF, фоллбэк не сработает, и мы вернем ошибку Gemini
      if (fileUrl.toLowerCase().endsWith('.pdf')) {
        throw new Error(`Gemini failed: ${geminiError.message}`);
      }

      // Если это картинка, пробуем GPT-4o
      const fallbackResponse = await openai.chat.completions.create({
        model: "qwen/qwen3-vl-235b-a22b-instruct",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: action === 'table' 
                  ? "Extract tables as HTML." 
                  : "Extract text." 
              },
              { 
                type: "image_url", 
                image_url: { url: fileUrl } 
              }
            ]
          }
        ],
        max_tokens: 4000
      });

      return res.status(200).json({ result: fallbackResponse.choices[0].message.content });
    }

  } catch (error: any) {
    console.error("❌ OCR Error:", error);
    return res.status(500).json({ error: error.message });
  }
}