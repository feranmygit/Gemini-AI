import { GoogleGenAI } from '@google/genai';

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set in Netlify environment variables.');
  return new GoogleGenAI({ apiKey: key });
}

function buildParts(text, attachments) {
  const parts = [];
  for (const file of (attachments ?? [])) {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
  }
  if (text?.trim()) parts.push({ text });
  return parts;
}

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }
    });
  }

  try {
    const { model, systemPrompt, temperature, messages, stream } = await req.json();
    const ai = getAI();

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: buildParts(m.content, m.attachments ?? []),
    }));

    const config = { systemInstruction: systemPrompt, temperature: temperature ?? 1 };

    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const response = await ai.models.generateContentStream({ model, contents, config });
            for await (const chunk of response) {
              const text = chunk.text || '';
              if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (e) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
          }
          controller.close();
        }
      });
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        }
      });
    } else {
      const response = await ai.models.generateContent({ model, contents, config });
      return Response.json({ text: response.text || '' }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
  } catch (err) {
    return Response.json({ error: err.message }, {
      status: 500, headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};

export const config = { path: '/api/chat' };
