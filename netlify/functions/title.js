import { GoogleGenAI } from '@google/genai';

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  try {
    const { firstMessage } = await req.json();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short title (3-5 words max) for a conversation that starts with: "${firstMessage.slice(0, 200)}". Return only the title, no quotes, no punctuation at the end.`,
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });
    return Response.json({ title: response.text?.trim() || 'New Conversation' }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};

export const config = { path: '/api/title' };
