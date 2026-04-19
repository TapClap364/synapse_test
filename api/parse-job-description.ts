/* eslint-disable @typescript-eslint/no-explicit-any */
import { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // Отключаем стандартный bodyParser для обработки файлов через formidable
  },
};

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    "HTTP-Referer": "https://synapse-app.vercel.app",
    "X-Title": "Synapse AI Document Parser",
  },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const form = formidable();
  
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing upload' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      // Читаем содержимое файла
      const rawContent = fs.readFileSync(file.filepath, 'utf8');
      
      // Отправляем ИИ для извлечения сути
      const systemPrompt = `You are an HR Specialist and AI Analyst. 
Analyze the provided Job Description (JD) and extract the core responsibilities, skills, and functions of this employee.
Format the output as a concise 1-paragraph summary (in RUSSIAN) that Synapse AI can use to assign tasks.

Focus on:
- What this person DOES.
- What technologies or tools they use.
- What their primary responsibilities are.

JD Content:
${rawContent.slice(0, 4000)} // Ограничиваем объем текста
`;

      const response = await openai.chat.completions.create({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.3,
      });

      const extractedRole = response.choices[0].message.content;

      return res.status(200).json({ 
        success: true, 
        extracted_role: extractedRole 
      });

    } catch (error: any) {
      console.error('Parser Error:', error);
      return res.status(500).json({ error: 'Failed to parse file content' });
    }
  });
}
