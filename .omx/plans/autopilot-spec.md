# TwinMind Live Suggestions Autopilot Spec

## Source of truth

- `IMPLEMENTATION_PLAN.md`
- `image.png`

## Product summary

TwinMind is a desktop-only meeting copilot web app with three columns:
1. microphone + transcript stream
2. live suggestion batches generated from recent transcript context
3. session-only chat for detailed answers grounded in transcript context

## Functional requirements

- Record audio in browser via `MediaRecorder`
- Restart recorder every 30 seconds so each uploaded WebM blob is self-contained
- Manual refresh stops current recorder, uploads current chunk, and immediately restarts recording
- `/api/refresh` orchestrates transcription and suggestion generation in one request
- `/api/transcribe` supports standalone transcription
- `/api/suggestions` supports standalone suggestion generation with one JSON-repair retry
- `/api/chat` returns streamed SSE tokens
- Settings modal stores Groq API key and prompt/context tuning in `localStorage`
- Suggestions appear in capped batches of five, with three suggestions each
- Clicking a suggestion sends its preview into chat linked to the suggestion ID
- Export downloads a JSON snapshot of transcript, suggestion batches, chat, and selected settings
- Theme defaults to dark and persists in `localStorage`

## Non-functional requirements

- TypeScript without strict mode
- App Router Next.js 14
- Vanilla CSS only
- Docker standalone output
- Build must pass with zero errors

## Main risks

- Browser MediaRecorder lifecycle and 30-second restart behavior
- Groq API shape differences between transcription and chat/completions
- JSON-only suggestion generation with retry path
- Keeping client-only state separated from server route logic
