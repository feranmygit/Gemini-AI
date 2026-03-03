import { GoogleGenAI, Modality } from '@google/genai';

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  try {
    const { prompt } = await req.json();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    });
    const images = [];
    for (const part of (response.candidates?.[0]?.content?.parts ?? [])) {
      if (part.inlineData?.data) {
        images.push({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' });
      }
    }
    return Response.json({ images }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
};

export const config = { path: '/api/generate-image' };
