# Gemini AI Studio

A beautiful, full-featured AI chat interface powered by Google Gemini.

## Features

- Multi-conversation management with auto-generated titles
- Real-time streaming responses
- Rich markdown rendering (code blocks, tables, lists, etc.)
- Configurable settings: model, temperature, system prompt, streaming
- Dark mode UI with elegant design
- Responsive (mobile + desktop)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API key

```bash
cp .env
```

Then open `.env` and replace `your_gemini_api_key_here` with your actual API key.

Get a free key at: https://aistudio.google.com/apikey

### 3. Start the development server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Models Available

| Model | Use Case |
|-------|----------|
| Gemini 2.5 Flash | Fast, efficient — great for most tasks |
| Gemini 2.5 Pro | Most capable — complex reasoning & analysis |
| Flash Lite | Fastest — lightweight tasks |

## Build for Production

```bash
npm run build
npm run preview
```
