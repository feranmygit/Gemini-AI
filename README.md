# Gemini AI Studio

A full-featured AI chat app with Google Gemini + local Ollama support.

## Quick Start (Local Dev)

```bash
npm install
cp .env.example .env        # add your GEMINI_API_KEY
npm run dev                 # frontend only (Gemini direct)
```

For Ollama local AI (no API key needed):
```bash
ollama serve                # in a separate terminal
npm run dev
# Then go to Settings → Ollama (Local)
```

---

## Deploy to Production

In production, the backend handles your API key so it's never exposed to users.

### Option A — Railway (easiest, free tier)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variable: `GEMINI_API_KEY=your_key_here`
4. Railway auto-detects Node.js and runs `npm start`
5. Done — your app is live!

### Option B — Render (free tier)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Set:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
5. Add environment variable: `GEMINI_API_KEY=your_key_here`
6. Deploy!

### Option C — VPS / your own server

```bash
git clone your-repo
cd gemini-app
npm install
npm run build

# Set your key
export GEMINI_API_KEY=your_key_here

# Start (port 3001 by default, or set PORT=80)
npm start
```

Use nginx or Caddy as a reverse proxy in front of it.

### Option D — Vercel / Netlify (frontend only)

These platforms serve static files only, not Node.js servers.
You'd need to host the backend separately (Railway, Render, etc.)
and update `API` in `src/services/apiService.ts` to point to it.

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `GEMINI_API_KEY` | Server only | Your Google AI Studio key |

**The key is NEVER sent to the browser in production.**

---

## How it Works

```
Browser  ──/api/chat──▶  Express Server  ──▶  Gemini API
                              ▲
                         GEMINI_API_KEY
                         (server only)
```

In development, the frontend can also talk to Gemini directly (key in .env)
or to a local Ollama instance.
