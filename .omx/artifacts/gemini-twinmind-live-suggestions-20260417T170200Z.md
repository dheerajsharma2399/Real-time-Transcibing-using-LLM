## Original user task

read implementation plan use gemini subagent to code and delegate tasks to. $ask-gemini $autopilot

## Final prompt sent to Gemini CLI

You are advising implementation of a desktop-only web app called TwinMind Live Suggestions. Stack and constraints: Next.js 14 App Router, TypeScript without strict mode, vanilla CSS only, React state only, no Tailwind, no auth/db/server sessions, Docker standalone output. Core behavior: microphone recording with MediaRecorder restarted every 30 seconds so each WebM chunk is self-contained; manual refresh stops current recorder, uploads the current blob to /api/refresh, then restarts recording; /api/refresh handles multipart audio upload, Groq Whisper transcription, then Groq suggestion generation and returns transcriptChunk plus suggestions; /api/transcribe handles transcription only; /api/suggestions accepts transcriptWindow recentWindow previousTitles chunkIds and retries once if model JSON is malformed; /api/chat streams SSE tokens from Groq; settings live in localStorage only; session state stays in memory with transcript chunks, suggestion batches capped to 5, chat messages, isRefreshing guard, theme persistence, export session JSON. Provide four sections only: Ordered implementation checklist, Biggest edge cases, Recommended dependency list, Verification checklist. Keep it concise and implementation-focused.

## Gemini output (raw)

### Ordered Implementation Checklist

1.  **Project Initialization & Config**
    *   Initialize Next.js 14 App Router project (`npx create-next-app@latest`).
    *   Disable TypeScript strict mode in `tsconfig.json`.
    *   Configure `next.config.mjs` for Docker standalone output (`output: 'standalone'`).
    *   Set up global vanilla CSS (remove Tailwind if installed by default).
2.  **State Management & Utilities**
    *   Create a React Context or custom hook for global state (transcript chunks, suggestion batches capped to 5, chat messages, `isRefreshing` guard).
    *   Implement `localStorage` synchronization for settings (Groq API key, theme) and theme persistence logic.
    *   Create utility to export session state to JSON.
3.  **Audio Recording Service (Frontend)**
    *   Implement a `MediaRecorder` manager.
    *   Set up the 30-second interval to stop, yield a self-contained WebM blob, and restart.
    *   Implement the manual refresh function: stop current recorder, trigger `/api/refresh`, and restart.
4.  **API Routes (Backend)**
    *   **`/api/transcribe`**: Handle multipart form data, route to Groq Whisper for transcription.
    *   **`/api/suggestions`**: Handle POST requests with context (`transcriptWindow`, `recentWindow`, `previousTitles`, `chunkIds`). Implement a 1-retry fallback for malformed JSON responses from the Groq LLM.
    *   **`/api/refresh`**: Combine `/api/transcribe` and `/api/suggestions` logic. Accept audio, transcribe via Whisper, generate suggestions, and return both.
    *   **`/api/chat`**: Implement Server-Sent Events (SSE) streaming using Groq's chat completion endpoint.
5.  **UI Implementation**
    *   Build the main dashboard layout (desktop-only focus).
    *   Create the transcript viewer component (displaying continuous text from chunks).
    *   Create the suggestions panel (displaying up to 5 batches of generated ideas).
    *   Build the chat interface to consume the SSE stream from `/api/chat`.
    *   Build the settings modal/page for API key entry and theme toggling.
6.  **Dockerization**
    *   Write a multi-stage `Dockerfile` leveraging Next.js standalone output.
    *   Create a `.dockerignore` file to exclude `node_modules` and local development files.

### Biggest Edge Cases

*   **Audio Chunk Boundary Cuts**: Words split exactly at the 30-second mark may be transcribed poorly by Whisper or lost entirely.
*   **MediaRecorder State Race Conditions**: Rapidly clicking the manual refresh button could trigger overlapping start/stop commands, throwing DOMExceptions. The `isRefreshing` guard must strictly lock recorder state changes.
*   **Browser Microphone Permissions**: The user might revoke permissions mid-session, or the browser might suspend the audio context if the tab is backgrounded.
*   **Malformed JSON from LLM**: Even with a 1-retry fallback on `/api/suggestions`, the Groq model might still fail to return valid JSON. The UI must gracefully handle a complete failure without crashing.
*   **Large In-Memory State**: Continuous recording over several hours will bloat the React state with transcript chunks and chat history, potentially degrading browser performance.
*   **Varying WebM Codec Support**: `MediaRecorder` defaults to different audio codecs depending on the browser (e.g., Opus in Chrome). Groq Whisper must explicitly support the exact WebM format/codec being uploaded.

### Recommended Dependency List

*   `next` (v14)
*   `react`, `react-dom`
*   `groq-sdk` (Official Groq Node.js client for simpler API interaction)
*   `formidable` or `busboy` (For parsing `multipart/form-data` audio uploads in Next.js API routes)
*   `lucide-react` or `react-icons` (For lightweight UI icons)
*   *(No Tailwind, no complex state managers, no strict TS)*

### Verification Checklist

*   [ ] Next.js builds successfully with `output: 'standalone'`.
*   [ ] Docker container builds and runs locally, serving the app on port 3000.
*   [ ] App requests microphone permissions on mount and begins 30-second chunking.
*   [ ] Manual refresh stops recording, triggers `/api/refresh`, and resumes recording without dropping the audio stream.
*   [ ] `/api/refresh` successfully returns a combined payload of text and structured suggestions.
*   [ ] `/api/suggestions` successfully recovers from a forced bad-JSON response on the first try.
*   [ ] Suggestions UI strictly caps at 5 batches; older batches are removed.
*   [ ] Chat interface streams tokens smoothly from `/api/chat` without buffering the entire response.
*   [ ] Settings (theme, API key) persist across hard page reloads via `localStorage`.
*   [ ] Export Session JSON downloads a valid file containing the current transcripts, suggestions, and chat history.

## Concise summary

Gemini reinforced the phase order in the local implementation plan and highlighted the main technical risks: MediaRecorder restart races, malformed JSON from Groq suggestions, codec compatibility, and long-running client memory growth.

## Action items / next steps

1. Scaffold the Next.js 14 project and config exactly to the plan.
2. Implement server routes and shared types/prompts first.
3. Implement recording/session hooks with strict refresh locking.
4. Build UI to the mockup, then verify with a clean production build.
