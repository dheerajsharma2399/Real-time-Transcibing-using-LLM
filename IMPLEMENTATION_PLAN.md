# TwinMind Live Suggestions — Build Instructions

This is the canonical plan. Follow it exactly. Do not add features not listed here. Do not use Tailwind. Do not use Vercel. Read every section before writing any code.

---

## Stack

| Concern | Decision |
|---------|----------|
| Framework | Next.js 14, App Router, TypeScript (not strict mode) |
| Styling | Vanilla CSS only. CSS custom properties for theming. |
| Audio | MediaRecorder API, WebM blobs |
| Transcription | Groq `whisper-large-v3` |
| Suggestions + Chat | Groq `openai/gpt-oss-120b` |
| Deployment | Docker + docker-compose → Dokploy |
| State | React only. No Redux, no Zustand. |
| Persistence | `localStorage` for settings only. Session state in memory. |

---

## File Structure

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── transcribe/route.ts
│   │       ├── suggestions/route.ts
│   │       ├── chat/route.ts
│   │       └── refresh/route.ts
│   ├── components/
│   │   ├── TranscriptPanel.tsx
│   │   ├── SuggestionsPanel.tsx
│   │   ├── SuggestionCard.tsx
│   │   ├── ChatPanel.tsx
│   │   └── SettingsModal.tsx
│   ├── hooks/
│   │   ├── useAudioRecorder.ts
│   │   └── useSession.ts
│   └── lib/
│       ├── types.ts
│       ├── prompts.ts
│       └── export.ts
├── Dockerfile
├── docker-compose.yml
├── next.config.js
├── .env.example
└── README.md
```

---

## Data Types (`lib/types.ts`)

```ts
export type TranscriptChunk = {
  id: string;
  text: string;
  createdAt: string;       // ISO8601
  audioStartMs: number;
  audioEndMs: number;
};

export type SuggestionType =
  | 'QUESTION'
  | 'ANSWER'
  | 'FACT_CHECK'
  | 'TALKING_PT'
  | 'CLARIFY'
  | 'NEXT_STEP';

export type Suggestion = {
  id: string;
  type: SuggestionType;
  title: string;
  preview: string;         // standalone value, 1-2 sentences
  detail: string;          // expanded answer, 3-5 paragraphs
  reason: string;          // why this suggestion was chosen
  basedOnChunkIds: string[];
  createdAt: string;
};

export type SuggestionBatch = {
  id: string;
  createdAt: string;
  suggestions: Suggestion[];
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  linkedSuggestionId?: string;
};

export type Settings = {
  groqApiKey: string;
  suggestionContextChars: number;
  chatContextChars: number;
  refreshIntervalSeconds: number;
  suggestionPrompt: string;
  chatPrompt: string;
};
```

---

## API Key Strategy

Every API route reads the key in this exact priority order:

```ts
const apiKey =
  req.headers.get('x-groq-key') ||   // UI-provided key (highest priority)
  process.env.GROQ_API_KEY ||         // env var fallback
  null;

if (!apiKey) return Response.json({ error: 'No API key' }, { status: 401 });
```

The client always sends the key from `localStorage` as the `x-groq-key` header if one is set.

---

## Audio Chunking (`hooks/useAudioRecorder.ts`)

**Critical production rule**: MediaRecorder only writes the WebM container header into the FIRST `ondataavailable` blob. All subsequent blobs from the same recorder session are not self-contained and will fail Whisper.

**Solution**: Restart the recorder every 30 seconds. Each restart produces a new self-contained Blob.

```
start()
  → create MediaRecorder, start with timeslice=1000ms
  → push each ondataavailable blob into chunkBuffer[]
  → after 30s: stop recorder
    → onstop fires → combine chunkBuffer into one Blob → send to /api/refresh
    → immediately start a new recorder (fresh chunkBuffer)

on manual refresh:
  → call recorder.stop() early
  → onstop fires → send Blob to /api/refresh
  → immediately restart recorder

on stopRecording():
  → call recorder.stop()
  → onstop fires → send any remaining Blob if size > 1000 bytes
  → do not restart
```

Skip Whisper call if blob size < 1000 bytes (silence or no audio).

Hook must expose: `{ isRecording, startRecording, stopRecording, triggerManualRefresh }`.

---

## API Routes

### `POST /api/refresh` ← orchestrator, most important

This single endpoint does both steps so the client makes one call:

1. Receive `multipart/form-data` with `audio` blob
2. Call Groq Whisper → get transcript text
3. Call GPT-OSS 120B → get 3 suggestions
4. Return `{ transcriptChunk, suggestions }` in one response

```ts
// Sequence inside the handler:
const transcriptText = await transcribeAudio(audioBlob, apiKey);
const suggestions = await generateSuggestions(transcriptText, previousContext, apiKey);
return Response.json({ transcriptChunk, suggestions });
```

This avoids two sequential client requests and race conditions.

### `POST /api/transcribe`

Standalone transcription only. Accepts `multipart/form-data` with `audio`. Returns `{ text: string }`.

### `POST /api/suggestions`

Accepts `{ transcriptWindow, recentWindow, previousTitles, chunkIds }`. Returns `{ suggestions: Suggestion[] }`.

**JSON parse retry**: If GPT-OSS returns malformed JSON, retry once appending to the prompt: `"Your previous response was not valid JSON. Return ONLY the JSON object, nothing else."` If second attempt also fails, return HTTP 500.

### `POST /api/chat` ← streaming SSE

Accepts `{ messages, transcriptWindow }` + `x-groq-key`. Returns SSE stream.

```ts
const stream = new ReadableStream({
  async start(controller) {
    const enc = new TextEncoder();
    for await (const chunk of groqStream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (token) controller.enqueue(enc.encode(`data: ${JSON.stringify({ token })}\n\n`));
    }
    controller.enqueue(enc.encode('data: [DONE]\n\n'));
    controller.close();
  }
});
return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
```

---

## Prompts (`lib/prompts.ts`)

Export all prompts as named string constants. Users can override in settings.

### `DEFAULT_SUGGESTION_PROMPT`

```
You are a real-time AI meeting copilot. Your job is to surface exactly 3 high-value suggestions that the conversation participant can act on RIGHT NOW.

Analyze the transcript below. Focus especially on the [RECENT] section — the last ~60 seconds of conversation.

SUGGESTION TYPES — assign one per suggestion, cover at least 2 different types:
- QUESTION    → A sharp, specific question the participant should ask the other person right now
- ANSWER      → A direct answer to a question that was just asked in the conversation
- FACT_CHECK  → Verify, correct, or push back on a specific claim that was just made
- TALKING_PT  → A relevant fact, statistic, or framing the participant could introduce
- CLARIFY     → Clarify an ambiguous term, assumption, or misunderstanding
- NEXT_STEP   → A concrete decision or action to propose right now

RULES:
1. If someone just asked a direct question, at least one suggestion MUST answer it (type: ANSWER)
2. If there is a factual claim that seems uncertain, include a FACT_CHECK
3. Each suggestion must be materially different from the others
4. Do NOT repeat any suggestion from the PREVIOUS_SUGGESTIONS list below
5. Preview must be standalone useful — the reader gains value without clicking
6. Keep title under 10 words
7. Include a "reason" field: one sentence explaining why you chose this suggestion now

OUTPUT: Return ONLY valid JSON. No markdown, no explanation, no code fences.
{
  "suggestions": [
    {
      "type": "QUESTION|ANSWER|FACT_CHECK|TALKING_PT|CLARIFY|NEXT_STEP",
      "title": "...",
      "preview": "1-2 sentences of standalone value",
      "detail": "3-5 paragraphs of expanded answer shown on click",
      "reason": "One sentence why this matters right now"
    }
  ]
}

[TRANSCRIPT - recent context]
{transcriptWindow}

[RECENT - last ~60 seconds, prioritize this]
{recentWindow}

[PREVIOUS_SUGGESTIONS - do not repeat these]
{previousTitles}
```

### `DEFAULT_CHAT_PROMPT`

```
You are a meeting assistant with access to a live conversation transcript. Answer questions clearly and directly.

Rules:
- Ground answers in the transcript when possible
- If you're inferring beyond what the transcript says, mark it clearly ("Based on context..." or "This isn't in the transcript, but...")
- Be concise unless the user asks for detail
- Use bullet points for multi-part answers
- If the question refers to a suggestion card, treat its preview text as the question context

Transcript context (rolling window):
{transcriptWindow}
```

---

## Session State (`hooks/useSession.ts`)

Single hook manages all session state.

```ts
// Internal state
const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
const [isRefreshing, setIsRefreshing] = useState(false);
const [settings, setSettings] = useState<Settings>(loadFromLocalStorage());
```

**Business logic rules**:
1. `suggestionBatches` capped at **5** — on each new batch: `setSuggestionBatches(prev => [newBatch, ...prev].slice(0, 5))`
2. `isRefreshing` guard — if `isRefreshing === true` when refresh is triggered, skip silently
3. Suggestion context = `fullTranscriptText.slice(-settings.suggestionContextChars)`
4. Recent window = `fullTranscriptText.slice(-500)` (always passed separately)
5. Previous titles = flat array of titles from last 2 batches (anti-repetition)
6. Chat context = `fullTranscriptText.slice(-settings.chatContextChars)`

---

## Error Handling

Handle all of these cases. Do not crash on any of them.

| Failure | Behavior |
|---------|----------|
| No API key | Block all API calls. Show settings modal immediately. |
| Mic permission denied | Inline error under mic button. Button disabled. |
| Blob < 1000 bytes | Skip silently. Do not call Whisper. |
| Whisper fails | Toast: "Transcription failed". Retry once after 2s. If retry fails, show inline error, keep existing transcript. |
| Suggestions fail | Toast: "Couldn't refresh suggestions". Keep last batch. |
| GPT-OSS malformed JSON | Retry once with "Return ONLY valid JSON" appended. If still fails, keep last batch. |
| Chat stream fails | Show "Error — try again" in chat thread. Keep history. |
| `isRefreshing = true` | Skip refresh silently. No queue. |
| Empty transcript (first 30s) | Show: "Recording… first suggestions appear after 30 seconds." Do not call `/api/suggestions`. |

---

## UI Layout

Desktop-only. No responsive or mobile CSS.

```css
.app-layout {
  display: grid;
  grid-template-columns: 300px 1fr 360px;
  grid-template-rows: 48px 1fr;
  height: 100vh;
  overflow: hidden;
}

.column {
  overflow-y: auto;
  padding: 16px;
  border-right: 1px solid var(--border);
}
```

**Dark mode (default)**:

```css
:root {
  --bg: #0d1117;
  --panel: #161b22;
  --panel-hover: #1c2128;
  --text: #c9d1d9;
  --text-muted: #8b949e;
  --border: #30363d;
  --accent: #4f9cf9;
  --accent-dim: #1f3a5f;
  --error: #f85149;
  --success: #3fb950;
}

[data-theme="light"] {
  --bg: #ffffff;
  --panel: #f6f8fa;
  --panel-hover: #eaeef2;
  --text: #1f2328;
  --text-muted: #57606a;
  --border: #d1d9e0;
  --accent: #0969da;
  --accent-dim: #ddf4ff;
  --error: #cf222e;
  --success: #1a7f37;
}
```

Toggle stored in `localStorage` as `theme`. Apply as `document.documentElement.dataset.theme`. Default: `dark`.

---

## Suggestion Card

```
┌──────────────────────────────────────────┐
│ [BADGE: QUESTION]                  14:23 │
│ Title text — ≤10 words                  │
│                                          │
│ Preview text that delivers value on its  │
│ own without clicking. 1-2 sentences.     │
└──────────────────────────────────────────┘
```

- Badge color per type: QUESTION=accent, ANSWER=green, FACT_CHECK=yellow, TALKING_PT=purple, CLARIFY=orange, NEXT_STEP=teal
- Clicking sends `preview` text as user chat message with `linkedSuggestionId` set
- Batch header: `Batch #3 · 14:23:05`
- Maximum 5 batches visible

---

## Settings Modal

Opens via ⚙ gear icon top-right. Auto-opens on first load if no API key.

| Field | Default |
|-------|---------|
| Groq API Key | `""` (password input) |
| Suggestion context (chars) | `3000` |
| Chat context (chars) | `8000` |
| Auto-refresh interval (s) | `30` |
| Suggestion system prompt | `DEFAULT_SUGGESTION_PROMPT` |
| Chat system prompt | `DEFAULT_CHAT_PROMPT` |

Save → write all to `localStorage`. Cancel → revert.

---

## Export (`lib/export.ts`)

Header button "Export Session" → downloads `twinmind-{timestamp}.json`:

```json
{
  "exported_at": "2026-04-17T14:30:00Z",
  "duration_seconds": 1840,
  "settings_used": { "suggestionContextChars": 3000, "chatContextChars": 8000 },
  "transcript": [{ "id": "...", "t": "14:20:01", "text": "..." }],
  "batches": [{
    "id": "...", "t": "14:20:31",
    "suggestions": [{ "type": "QUESTION", "title": "...", "preview": "...", "detail": "...", "reason": "..." }]
  }],
  "chat": [{ "id": "...", "t": "14:21:05", "role": "user", "content": "...", "linkedSuggestionId": "..." }]
}
```

---

## Docker

### `next.config.js`
```js
module.exports = { output: 'standalone' };
```

### `Dockerfile`
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3008
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3008
CMD ["node", "server.js"]
```

### `docker-compose.yml`
```yaml
services:
  twinmind:
    build: .
    ports:
      - "3008:3008"
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - PORT=3008
      - HOSTNAME=0.0.0.0
    restart: unless-stopped
```

### `.env.example`
```
GROQ_API_KEY=
```

---

## Build Order

Follow this sequence exactly:

1. `next.config.js`
2. `lib/types.ts`
3. `lib/prompts.ts`
4. `app/globals.css`
5. `app/api/transcribe/route.ts`
6. `app/api/suggestions/route.ts` — with JSON parse retry
7. `app/api/chat/route.ts` — SSE streaming
8. `app/api/refresh/route.ts` — orchestrates transcribe + suggest
9. `hooks/useAudioRecorder.ts` — MediaRecorder restart strategy
10. `hooks/useSession.ts` — all state, isRefreshing guard, 5-batch cap
11. `lib/export.ts`
12. `components/SettingsModal.tsx`
13. `components/SuggestionCard.tsx`
14. `components/TranscriptPanel.tsx`
15. `components/SuggestionsPanel.tsx` — batch cap, empty state for first 30s
16. `components/ChatPanel.tsx` — SSE reader
17. `app/page.tsx` — wire all columns, dark mode toggle, export button
18. `app/layout.tsx`
19. `Dockerfile` + `docker-compose.yml` + `.env.example`
20. `README.md`
21. `npm run build` — must pass zero errors

---

## Rules: What NOT to Do

- Do not use Tailwind, shadcn, or any UI component library
- Do not use Vercel-specific features
- Do not add auth, databases, or server-side session storage
- Do not add mobile or responsive CSS
- Do not add features not in this document
- Do not leave TODO comments in final code
- Do not hard-code any API key anywhere
