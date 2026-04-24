# TwinMind Live Suggestions

TwinMind Live Suggestions is a desktop-only meeting copilot built with Next.js 14, TypeScript, vanilla CSS, and Groq. It records browser audio in self-contained WebM chunks, transcribes them with Groq Whisper, generates live suggestions, and supports transcript-grounded chat.

## Stack

- Next.js 14 App Router
- TypeScript
- Vanilla CSS
- Groq Whisper (`whisper-large-v3`) for transcription
- Groq `openai/gpt-oss-120b` for suggestions and chat
- Docker standalone deployment

## API key priority

Every API route reads the Groq API key in this order:

1. `x-groq-key` request header
2. `GROQ_API_KEY` environment variable

If neither is present, the API returns `401 { "error": "No API key" }`.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a local env file if you want a server-side fallback key:
   ```bash
   cp .env.example .env
   ```
3. Set `GROQ_API_KEY` in `.env` or provide `x-groq-key` from the client.
4. Start the app:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3008`.

## Production build

```bash
npm run build
npm run start
```

Both `npm run dev` and `npm run start` listen on port `3008`.

`next.config.js` uses `output: 'standalone'` so Docker can run the generated `server.js` entrypoint.

## Docker

The container image follows the standalone Next.js output flow from `IMPLEMENTATION_PLAN.md`.

### Build and run with Docker Compose

1. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Set `GROQ_API_KEY` in `.env`.
3. Start the container:
   ```bash
   docker compose up --build
   ```
4. Visit `http://localhost:3008`.

The Docker image expects a committed `package-lock.json` because the Dockerfile uses `npm ci` for reproducible installs.

## Dokploy notes

- Deploy with the included `Dockerfile` / `docker-compose.yml`.
- The compose file publishes host port `3008` to the app's internal port `3008` to avoid common host-port conflicts like `3000` already being allocated.
- If configuring Dokploy proxy routing, point it at container/internal port `3008`; direct host access uses port `3008`.
- Set `GROQ_API_KEY` in Dokploy environment variables unless your client always sends `x-groq-key`.
- The app is serverful and requires outbound HTTPS access to Groq.

## API routes

- `POST /api/refresh` — multipart audio upload, transcription, and suggestion generation in one call
- `POST /api/transcribe` — transcription only
- `POST /api/suggestions` — suggestion generation with one JSON-repair retry
- `POST /api/chat` — transcript-grounded streaming SSE chat
