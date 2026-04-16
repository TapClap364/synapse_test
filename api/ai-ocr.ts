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
    const { imageUrl, action = 'extract' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Используем GPT-4 Vision для анализа изображений
    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3.2-11b-vision-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: action === 'table' 
                ? "Extract all tables from this image and return them as HTML <table> format. Only return the HTML table code, no explanations."
                : "Extract all text from this document/image. Preserve formatting as much as possible. Return clean text."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 4000
    });

    const extractedText = response.choices[0].message.content;
    return res.status(200).json({ result: extractedText });

  } catch (error: any) {
    console.error("OCR Error:", error);
    return res.status(500).json({ error: error.message });
  }
}