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
    const { fileUrl, action = 'extract', fileType = 'image' } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'fileUrl is required' });
    }

    console.log('🔍 OCR Request:', { fileUrl, action, fileType });

    // Определяем модель: Gemini для PDF, GPT-4o для изображений (как фоллбэк)
    const isPdf = fileType === 'application/pdf' || fileUrl.endsWith('.pdf');
    const primaryModel = isPdf ? "google/gemini-1.5-pro-latest" : "openai/gpt-4o";
    
    let response;
    let lastError: any;

    // Пробуем основную модель
    try {
      response = await openai.chat.completions.create({
        model: primaryModel,
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: action === 'table' 
                  ? "Extract ALL tables from this document. Return them as valid HTML <table> code. Do NOT add explanations, markdown, or text outside the HTML."
                  : "Extract all text from this document. Preserve original structure, line breaks, and formatting. Return clean text."
              },
              isPdf 
                ? { type: "file", file: { url: fileUrl } }
                : { type: "image_url", image_url: { url: fileUrl, detail: "high" } }
            ]
          }
        ],
        max_tokens: 8000,
        temperature: 0.1
      });
    } catch (e: any) {
      console.log('⚠️ Primary model failed, trying fallback:', e.message);
      lastError = e;
      
      // Фоллбэк: если это изображение и первичная модель не сработала
      if (!isPdf) {
        try {
          response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { 
                    type: "text", 
                    text: action === 'table' 
                      ? "Extract tables as HTML <table> code only."
                      : "Extract text preserving structure."
                  },
                  { type: "image_url", image_url: { url: fileUrl, detail: "high" } }
                ]
              }
            ],
            max_tokens: 4000
          });
        } catch (fallbackError: any) {
          console.error('❌ Fallback also failed:', fallbackError.message);
          throw new Error(`OCR failed: ${lastError.message}. Fallback: ${fallbackError.message}`);
        }
      } else {
        throw e; // Для PDF не делаем фоллбэк на image-only модели
      }
    }

    if (!response?.choices?.[0]?.message?.content) {
      throw new Error('Empty response from AI model');
    }

    const result = response.choices[0].message.content;
    console.log('✅ OCR completed, result length:', result.length);
    
    return res.status(200).json({ result });

  } catch (error: any) {
    console.error("OCR Error:", error);
    
    // Дружелюбные сообщения об ошибках
    let userMessage = error.message;
    if (error.message?.includes('401') || error.message?.includes('API key')) {
      userMessage = 'Ошибка авторизации: проверь OPENROUTER_API_KEY';
    } else if (error.message?.includes('404') || error.message?.includes('model')) {
      userMessage = 'Модель недоступна. Попробуй позже или проверь доступные модели в OpenRouter.';
    } else if (error.message?.includes('400') || error.message?.includes('invalid')) {
      userMessage = 'Неподдерживаемый формат файла. Попробуй другой PDF или изображение.';
    }
    
    return res.status(500).json({ 
      error: userMessage,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}