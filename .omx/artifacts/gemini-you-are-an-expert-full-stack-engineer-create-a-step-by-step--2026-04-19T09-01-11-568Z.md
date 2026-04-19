# gemini advisor artifact

- Provider: gemini
- Exit code: 0
- Created at: 2026-04-19T09:01:11.568Z

## Original task

You are an expert full-stack engineer. Create a step-by-step development plan (tasks in order) to build the app exactly as specified below. Do NOT add any features beyond the spec. Include: (1) file-by-file build sequence, (2) key implementation details/gotchas, (3) verification checklist (manual + build), (4) risks and mitigations.\n\nSPEC SUMMARY:\n- Next.js 14 App Router + TypeScript (not strict).\n- Vanilla CSS only (no Tailwind/shadcn). Desktop-only grid: 3 columns (Transcript 300px, Suggestions 1fr, Chat 360px) + 48px top bar. Dark mode default; light theme via data-theme stored in localStorage.\n- Audio: MediaRecorder. CRITICAL: only first ondataavailable has WebM header; therefore restart recorder every 30s. Timeslice 1s to buffer chunks. On stop: combine buffered blobs into a single Blob and send as multipart/form-data to POST /api/refresh. Skip if blob size < 1000 bytes. Manual refresh stops early then restarts immediately. stopRecording stops and does not restart. Hook API: { isRecording, startRecording, stopRecording, triggerManualRefresh }.\n- Groq API key strategy (API routes): apiKey = req.headers.get('x-groq-key') || process.env.GROQ_API_KEY || null; if missing => 401. Client always sends x-groq-key if present in localStorage.\n- Data types: TranscriptChunk (id,text,createdAt,audioStartMs,audioEndMs), Suggestion (id,type,title,preview,detail,reason,basedOnChunkIds,createdAt), SuggestionBatch (id,createdAt,suggestions), ChatMessage (id,role,content,createdAt,linkedSuggestionId?), Settings (groqApiKey, suggestionContextChars, chatContextChars, refreshIntervalSeconds, suggestionPrompt, chatPrompt).\n- API routes:\n  * POST /api/refresh (orchestrator): receive audio blob; call Groq whisper-large-v3 => transcript text; call Groq openai/gpt-oss-120b => 3 suggestions; return { transcriptChunk, suggestions }. Use previousContext windows and previousTitles anti-repeat.\n  * POST /api/transcribe: audio => { text }.\n  * POST /api/suggestions: body { transcriptWindow, recentWindow, previousTitles, chunkIds } => { suggestions }. JSON parse retry once if malformed with extra instruction: 'Return ONLY valid JSON'.\n  * POST /api/chat: SSE streaming; accepts { messages, transcriptWindow } and streams tokens as data: {token} then [DONE].\n- useSession hook: manage transcriptChunks, suggestionBatches (cap 5, prepend new), chatMessages, isRefreshing guard (skip if true), settings (from localStorage). Suggestion context = full transcript slice(-suggestionContextChars). Recent = slice(-500). Previous titles from last 2 batches. Chat context = slice(-chatContextChars).\n- Error handling table includes: No API key => block API calls + open settings. Mic permission denied => inline error under mic button + disable. Whisper fails => toast + retry once after 2s; if still fails, inline error, keep existing transcript. Suggestions fail => toast, keep last batch. Malformed JSON => retry once else keep last batch. Chat stream fails => show error in thread. If isRefreshing true => silently skip. Empty transcript first 30s => show recording message and do not call /api/suggestions.\n- Components: SettingsModal, SuggestionCard (badge colors per type; click sends preview as chat message linkedSuggestionId), TranscriptPanel, SuggestionsPanel (5 batch cap, empty state first 30s), ChatPanel (SSE reader). Page wires columns, dark mode toggle, export button.\n- Export: downloads twinmind-{timestamp}.json containing settings used, transcript, batches, chat, duration_seconds, exported_at.\n- Docker: next.config.js output: 'standalone'; Dockerfile multi-stage; docker-compose exposes 3000 and env GROQ_API_KEY.\n- Build order (must match): next.config.js, lib/types.ts, lib/prompts.ts, globals.css, api routes (transcribe, suggestions w retry, chat SSE, refresh), hooks (useAudioRecorder, useSession), export, components, page/layout, docker files, README, npm run build must pass.

## Final prompt

You are an expert full-stack engineer. Create a step-by-step development plan (tasks in order) to build the app exactly as specified below. Do NOT add any features beyond the spec. Include: (1) file-by-file build sequence, (2) key implementation details/gotchas, (3) verification checklist (manual + build), (4) risks and mitigations.\n\nSPEC SUMMARY:\n- Next.js 14 App Router + TypeScript (not strict).\n- Vanilla CSS only (no Tailwind/shadcn). Desktop-only grid: 3 columns (Transcript 300px, Suggestions 1fr, Chat 360px) + 48px top bar. Dark mode default; light theme via data-theme stored in localStorage.\n- Audio: MediaRecorder. CRITICAL: only first ondataavailable has WebM header; therefore restart recorder every 30s. Timeslice 1s to buffer chunks. On stop: combine buffered blobs into a single Blob and send as multipart/form-data to POST /api/refresh. Skip if blob size < 1000 bytes. Manual refresh stops early then restarts immediately. stopRecording stops and does not restart. Hook API: { isRecording, startRecording, stopRecording, triggerManualRefresh }.\n- Groq API key strategy (API routes): apiKey = req.headers.get('x-groq-key') || process.env.GROQ_API_KEY || null; if missing => 401. Client always sends x-groq-key if present in localStorage.\n- Data types: TranscriptChunk (id,text,createdAt,audioStartMs,audioEndMs), Suggestion (id,type,title,preview,detail,reason,basedOnChunkIds,createdAt), SuggestionBatch (id,createdAt,suggestions), ChatMessage (id,role,content,createdAt,linkedSuggestionId?), Settings (groqApiKey, suggestionContextChars, chatContextChars, refreshIntervalSeconds, suggestionPrompt, chatPrompt).\n- API routes:\n  * POST /api/refresh (orchestrator): receive audio blob; call Groq whisper-large-v3 => transcript text; call Groq openai/gpt-oss-120b => 3 suggestions; return { transcriptChunk, suggestions }. Use previousContext windows and previousTitles anti-repeat.\n  * POST /api/transcribe: audio => { text }.\n  * POST /api/suggestions: body { transcriptWindow, recentWindow, previousTitles, chunkIds } => { suggestions }. JSON parse retry once if malformed with extra instruction: 'Return ONLY valid JSON'.\n  * POST /api/chat: SSE streaming; accepts { messages, transcriptWindow } and streams tokens as data: {token} then [DONE].\n- useSession hook: manage transcriptChunks, suggestionBatches (cap 5, prepend new), chatMessages, isRefreshing guard (skip if true), settings (from localStorage). Suggestion context = full transcript slice(-suggestionContextChars). Recent = slice(-500). Previous titles from last 2 batches. Chat context = slice(-chatContextChars).\n- Error handling table includes: No API key => block API calls + open settings. Mic permission denied => inline error under mic button + disable. Whisper fails => toast + retry once after 2s; if still fails, inline error, keep existing transcript. Suggestions fail => toast, keep last batch. Malformed JSON => retry once else keep last batch. Chat stream fails => show error in thread. If isRefreshing true => silently skip. Empty transcript first 30s => show recording message and do not call /api/suggestions.\n- Components: SettingsModal, SuggestionCard (badge colors per type; click sends preview as chat message linkedSuggestionId), TranscriptPanel, SuggestionsPanel (5 batch cap, empty state first 30s), ChatPanel (SSE reader). Page wires columns, dark mode toggle, export button.\n- Export: downloads twinmind-{timestamp}.json containing settings used, transcript, batches, chat, duration_seconds, exported_at.\n- Docker: next.config.js output: 'standalone'; Dockerfile multi-stage; docker-compose exposes 3000 and env GROQ_API_KEY.\n- Build order (must match): next.config.js, lib/types.ts, lib/prompts.ts, globals.css, api routes (transcribe, suggestions w retry, chat SSE, refresh), hooks (useAudioRecorder, useSession), export, components, page/layout, docker files, README, npm run build must pass.

## Raw output

```text
Here is the step-by-step development plan to build Twinmind exactly to your specifications. 

### 1. File-by-File Build Sequence

1. **`next.config.js`**: Configure for `output: 'standalone'` to support Docker multi-stage builds.
2. **`src/lib/types.ts`**: Define `TranscriptChunk`, `Suggestion`, `SuggestionBatch`, `ChatMessage`, and `Settings` interfaces.
3. **`src/lib/prompts.ts`**: Define the system instructions and retry prompts for Groq suggestions and the chat agent.
4. **`src/app/globals.css`**: Implement Vanilla CSS grid layout (300px, 1fr, 360px + 48px top bar), dark mode default, and light mode variables controlled via `[data-theme="light"]`.
5. **`src/app/api/transcribe/route.ts`**: Implement POST endpoint for Groq `whisper-large-v3` transcription.
6. **`src/app/api/suggestions/route.ts`**: Implement POST endpoint calling Groq `openai/gpt-oss-120b` (or specified model) to generate suggestions, including the JSON parse 1-time retry logic.
7. **`src/app/api/chat/route.ts`**: Implement POST endpoint for server-sent events (SSE) streaming.
8. **`src/app/api/refresh/route.ts`**: Implement orchestrator POST endpoint. Receives multipart audio, calls `/api/transcribe`, calls `/api/suggestions`, and returns the combined payload.
9. **`src/hooks/useAudioRecorder.ts`**: Implement `MediaRecorder` logic with the 30s hard restart cycle, 1s timeslice, `> 1000 bytes` verification, and expose the hook API (`isRecording`, `startRecording`, `stopRecording`, `triggerManualRefresh`).
10. **`src/hooks/useSession.ts`**: Implement core state management (chunks, batches capped at 5, chat messages, settings fallback to localStorage) and the `isRefreshing` guard/context slicing logic.
11. **`src/lib/export.ts`**: Implement the JSON blob download logic to generate `twinmind-{timestamp}.json`.
12. **`src/components/SettingsModal.tsx`**: Implement the settings form, saving values to localStorage and handling the empty API key state.
13. **`src/components/SuggestionCard.tsx`**: Implement suggestion display with type-based badge colors and click-to-chat preview integration (`linkedSuggestionId`).
14. **`src/components/TranscriptPanel.tsx`**: Implement the streaming and finalized transcript rendering column.
15. **`src/components/SuggestionsPanel.tsx`**: Implement the suggestions column, batch rendering (max 5), and the "First 30s empty state".
16. **`src/components/ChatPanel.tsx`**: Implement the SSE chat reader, message thread UI, and error handling.
17. **`src/app/layout.tsx` & `src/app/page.tsx`**: Assemble the 3-column layout, wire the dark/light toggle, header bar, export button, and component integration.
18. **`Dockerfile` & `.dockerignore`**: Create the multi-stage Dockerfile optimized for Next.js standalone output.
19. **`docker-compose.yml`**: Map port 3000 and pass the `GROQ_API_KEY` environment variable.
20. **`README.md`**: Document the project, environment variables, and run instructions.

---

### 2. Key Implementation Details & Gotchas

- **MediaRecorder Blob Headers (CRITICAL):** The WebM header is only written on the *first* `ondataavailable` event after `start()`. Stopping and requesting data without a fresh start results in corrupted/headerless audio files that Whisper cannot parse. The 30-second logic must call `stop()`, process the chunks, and immediately call `start()` again to reset the headers.
- **Audio Refresh Logic:** When `triggerManualRefresh` is called or the 30s interval fires, accumulate the chunks. If the total blob size is `< 1000 bytes`, drop it and restart. If valid, send it as `multipart/form-data` to `/api/refresh`. `stopRecording` must halt the recorder entirely without a restart loop.
- **API Key Resolution:** In all API routes, strictly extract the key via `req.headers.get('x-groq-key') || process.env.GROQ_API_KEY || null`. If null, return a `401 Unauthorized`. The frontend API client must append the `x-groq-key` header to all requests if it exists in local settings.
- **Suggestions JSON Retry Logic:** In `/api/suggestions`, `JSON.parse` the LLM response. Catch `SyntaxError`, and if it fails, make exactly *one* immediate retry to the model appending the instruction `'Return ONLY valid JSON'` to the prompt.
- **Server-Sent Events (SSE):** For `/api/chat`, ensure the response headers are set to `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive`. Stream tokens back as `data: {token}\n\n` and terminate with `data: [DONE]\n\n`.
- **State Guarding & Context:** Use `isRefreshing` in `useSession` to silently drop concurrent interval calls to `/api/refresh`. Enforce strict slicing based on Settings limits (`.slice(-suggestionContextChars)` for transcripts sent to suggestions, `.slice(-500)` for recent context, `.slice(-chatContextChars)` for chat context).
- **Error Handling Implementation:** 
  - *No API Key*: `useSession` catches 401s and opens `SettingsModal`.
  - *Mic Denied*: Catch `NotAllowedError` on `getUserMedia`, show inline error below the mic button, and disable it.
  - *Whisper Fails*: Wait 2s, retry once. If it still fails, show an inline error in the transcript panel and retain the existing transcript.
  - *First 30s Empty*: Check if the transcript is completely empty before calling `/api/suggestions` to avoid hallucinations.

---

### 3. Verification Checklist (Manual + Build)

**Build & Static Verification:**
- [ ] Run `npm run build` – Must complete successfully with zero TypeScript/lint errors.
- [ ] Verify the `.next/standalone` output directory is successfully generated.
- [ ] `docker build -t twinmind .` builds successfully without missing dependencies.
- [ ] `docker-compose up` serves the application reliably on `localhost:3000`.

**Manual Testing:**
- [ ] **UI/Layout:** Verify the strict 3-column CSS grid (300px, 1fr, 360px), 48px top bar, and theme toggle (dark/light persist across reloads in localStorage).
- [ ] **Audio Lifecycle:** Start recording -> Verify mic permissions -> Verify `triggerManualRefresh` works -> Verify 30s automatic restart loop -> Stop recording.
- [ ] **API Key Priority:** Test with ONLY env var, ONLY client localStorage, and neither (verify 401 triggers the Settings modal).
- [ ] **Transcription:** Speak into the mic -> Wait/Refresh -> Verify text appears in TranscriptPanel. Verify the `< 1000 byte` drop logic (silence doesn't trigger the API).
- [ ] **Suggestions:** Verify suggestions appear in batches, capping at 5. Verify the JSON parse fallback logic (simulate a bad JSON response if possible).
- [ ] **Chat:** Click a `SuggestionCard` -> Verify it populates the ChatPanel with a `linkedSuggestionId` -> Send a message -> Verify SSE streaming token responses.
- [ ] **Export:** Click the export button -> Verify the downloaded JSON contains exactly: `settings`, `transcript`, `batches`, `chat`, `duration_seconds`, and `exported_at`.

---

### 4. Risks and Mitigations

- **Risk:** MediaRecorder WebM blob corruption or incompatibility with Groq Whisper API.
  - **Mitigation:** The strict 30-second restart lifecycle ensures a fresh WebM header every time. Explicitly set the MIME type (e.g., `audio/webm;codecs=opus`) on initialization to guarantee format consistency across browsers.
- **Risk:** Rate limiting or excessive billing on Groq API due to frequent polling or silence.
  - **Mitigation:** The 30s interval provides a natural cadence limit. The client-side `< 1000 bytes` blob check prevents empty/silent audio chunks from triggering unnecessary and expensive API calls.
- **Risk:** Stale closures in `useAudioRecorder` or `useSession` `setInterval` loops causing overlapping API calls.
  - **Mitigation:** Rely heavily on `useRef` for mutable state accessed inside timers (e.g., current audio chunks, `isRefreshing` lock, latest transcript text) to ensure the interval always references the most up-to-date application state.
- **Risk:** JSON hallucination from the 120b model on suggestions, breaking the UI rendering.
  - **Mitigation:** Implement strict `try/catch` wrappers around JSON parsing. The 1-time retry with the strict `'Return ONLY valid JSON'` prompt catches most transient errors. If it still fails, gracefully retain the *previous* suggestion batch rather than crashing the panel.

```

## Concise summary

Provider completed successfully. Review the raw output for details.

## Action items

- Review the response and extract decisions you want to apply.
- Capture follow-up implementation tasks if needed.
