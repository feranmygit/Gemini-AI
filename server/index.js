import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Modality } from '@google/genai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve built frontend in production
app.use(express.static(join(__dirname, '../dist')));

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY environment variable is not set on the server.');
  return new GoogleGenAI({ apiKey: key });
}

// ── /api/chat  (streaming + non-streaming text) ──────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { model, systemPrompt, temperature, messages, stream } = req.body;
    const ai = getAI();

    // Build contents array from message history
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: buildParts(m.content, m.attachments ?? []),
    }));

    const config = {
      systemInstruction: systemPrompt,
      temperature: temperature ?? 1,
    };

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await ai.models.generateContentStream({ model, contents, config });
      for await (const chunk of response) {
        const text = chunk.text || '';
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const response = await ai.models.generateContent({ model, contents, config });
      res.json({ text: response.text || '' });
    }
  } catch (err) {
    console.error('/api/chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/generate-image ───────────────────────────────────────────────────────
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const ai = getAI();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const images = [];
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        images.push({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'image/png' });
      }
    }
    res.json({ images });
  } catch (err) {
    console.error('/api/generate-image error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/title ────────────────────────────────────────────────────────────────
app.post('/api/title', async (req, res) => {
  try {
    const { firstMessage } = req.body;
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a very short title (3-5 words max) for a conversation that starts with: "${firstMessage.slice(0, 200)}". Return only the title, no quotes, no punctuation at the end.`,
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });
    res.json({ title: response.text?.trim() || 'New Conversation' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────
function buildParts(text, attachments) {
  const parts = [];
  for (const file of (attachments ?? [])) {
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
  }
  if (text?.trim()) parts.push({ text });
  return parts;
}

// Catch-all: serve frontend for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   API key: ${process.env.GEMINI_API_KEY ? '✅ set' : '❌ MISSING — set GEMINI_API_KEY'}\n`);
});
