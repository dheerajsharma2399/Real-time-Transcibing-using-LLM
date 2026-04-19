## Original user task

$autopilot $ask-gemini proceed

## Final prompt sent to Gemini CLI

We are resuming implementation of TwinMind Live Suggestions from a canonical IMPLEMENTATION_PLAN.md. Existing work already includes shared server utilities and API routes, but the client UI/hooks/docs still need to be built and verified. Give concise advice in exactly four sections: 1) highest-risk remaining gaps, 2) clean client architecture for useAudioRecorder plus useSession, 3) common Next.js 14 pitfalls for browser MediaRecorder and SSE chat, 4) final verification checklist. Keep it implementation-focused and aligned to vanilla CSS, desktop-only, no added features.

## Gemini output (raw)

Here is the implementation-focused advice for completing the TwinMind Live Suggestions client, adhering to your constraints:

### 1. Highest-Risk Remaining Gaps
*   **State Synchronization:** Coordinating the recording state (`useAudioRecorder`), the transcription polling/streaming, and the AI chat state (`useSession`) without causing race conditions or redundant API calls.
*   **Audio Chunking & Upload:** Ensuring `MediaRecorder` chunks are correctly captured, converted to a compatible format (e.g., WebM/WAV), and uploaded to the `/api/transcribe` route reliably before the user speaks the next thought.
*   **Vanilla CSS Complexity:** Maintaining a polished, desktop-only UI with vanilla CSS without falling back to inline styles or creating global namespace collisions.
*   **Error Handling:** Gracefully managing microphone permission denials, network failures during SSE streaming, or API rate limits without breaking the UX.

### 2. Clean Client Architecture (`useAudioRecorder` + `useSession`)
*   **Separation of Concerns:** Keep `useAudioRecorder` strictly focused on the Web Audio API (permissions, starting/stopping, chunk emission). Keep `useSession` focused on API communication (sending text, managing the message history, handling SSE streams).
*   **The Orchestrator:** Create a higher-level component or hook (e.g., `useLiveSuggestions`) that glues them together. It should listen for complete audio chunks from `useAudioRecorder`, send them to `/api/transcribe`, and pipe the resulting text into `useSession` to fetch suggestions.
*   **Immutable State:** Use React state immutably for message arrays to ensure proper re-renders when new SSE chunks arrive.

### 3. Next.js 14 Pitfalls (MediaRecorder & SSE)
*   **Client Components (`'use client'`):** Web APIs like `MediaRecorder` and `navigator.mediaDevices` are browser-only. Ensure any components or hooks utilizing them have the `'use client'` directive at the top.
*   **SSE Edge Compatibility:** If using Edge runtime for Next.js API routes, ensure your SSE stream implementation uses standard web `ReadableStream` rather than Node.js specific streams, as Edge has limited Node API support.
*   **Hydration Mismatches:** Avoid rendering UI based on browser-specific state (like checking for microphone availability) during the initial server render. Wait until `useEffect` mounts on the client.
*   **Connection Dropping:** Browsers can sometimes abruptly close long-running SSE connections. Implement automatic reconnection logic with exponential backoff in your client code if the stream drops unexpectedly.

### 4. Final Verification Checklist
*   [ ] **Microphone Permissions:** Prompt appears correctly; UI handles both acceptance and denial states.
*   [ ] **Recording Indicator:** Clear visual feedback when the microphone is actively recording.
*   [ ] **Transcription Accuracy:** Audio is successfully sent to `/api/transcribe` and text returns accurately.
*   [ ] **Live Suggestions (SSE):** The `/api/suggestions` route streams text smoothly into the UI without stuttering or overwriting previous suggestions.
*   [ ] **Vanilla CSS (Desktop):** Styling strictly uses vanilla CSS (no Tailwind/CSS-in-JS). Layout is optimized for desktop viewports only (no responsive mobile hacks).
*   [ ] **Strict Scope:** No additional features (like authentication, saving sessions, or mobile layouts) were introduced beyond the core live suggestions flow.
*   [ ] **Zero Console Errors:** No React key warnings, hydration errors, or unhandled promise rejections during a full recording/suggestion cycle.

## Concise summary

Gemini confirmed the riskiest remaining work is on the client: coordinating recorder state with refresh/chat state, avoiding browser-only hydration issues, and handling stream or permission failures cleanly.

## Action items / next steps

1. Implement the client-only hooks and components with a clean separation between recorder concerns and session state.
2. Add the desktop-only layout and settings/export/theme flow.
3. Run a full production build and fix any integration or typing issues.
