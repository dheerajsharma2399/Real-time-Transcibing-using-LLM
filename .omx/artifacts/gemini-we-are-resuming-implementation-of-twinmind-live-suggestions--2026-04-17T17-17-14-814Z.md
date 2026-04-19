# gemini advisor artifact

- Provider: gemini
- Exit code: 0
- Created at: 2026-04-17T17:17:14.814Z

## Original task

We are resuming implementation of TwinMind Live Suggestions from a canonical IMPLEMENTATION_PLAN.md. Existing work already includes shared server utilities and API routes, but the client UI/hooks/docs still need to be built and verified. Give concise advice in exactly four sections: 1) highest-risk remaining gaps, 2) clean client architecture for useAudioRecorder plus useSession, 3) common Next.js 14 pitfalls for browser MediaRecorder and SSE chat, 4) final verification checklist. Keep it implementation-focused and aligned to vanilla CSS, desktop-only, no added features.

## Final prompt

We are resuming implementation of TwinMind Live Suggestions from a canonical IMPLEMENTATION_PLAN.md. Existing work already includes shared server utilities and API routes, but the client UI/hooks/docs still need to be built and verified. Give concise advice in exactly four sections: 1) highest-risk remaining gaps, 2) clean client architecture for useAudioRecorder plus useSession, 3) common Next.js 14 pitfalls for browser MediaRecorder and SSE chat, 4) final verification checklist. Keep it implementation-focused and aligned to vanilla CSS, desktop-only, no added features.

## Raw output

```text
Here is the targeted implementation advice based strictly on your canonical plan, scoped to vanilla CSS, desktop-only, and existing constraints.

### 1) Highest-Risk Remaining Gaps
*   **Audio Loss During Restart:** The required 30-second `MediaRecorder` restart strategy can drop audio if the start/stop cycle is not perfectly synchronous. The transition must be instantaneous.
*   **API Key Propagation:** Failing to inject the `x-groq-key` header into every request (including the native `fetch` for SSE). If `localStorage` loads too late, early requests will fail.
*   **JSON Parse Failures:** `openai/gpt-oss-120b` is prone to emitting markdown code fences even when told not to. Your `/api/suggestions` fallback logic (retry once) is critical to preventing silent UI failures.
*   **State Race Conditions:** The `isRefreshing` lock in `useSession` is the only thing preventing duplicate concurrent Whisper/GPT requests. It must be strictly enforced.

### 2) Clean Client Architecture (`useAudioRecorder` + `useSession`)
*   **Separation of Concerns:** `useAudioRecorder` should strictly manage the Web API lifecycle and interval timers. It should accept an `onChunkReady(blob: Blob)` callback. It should hold zero business state.
*   **Single Source of Truth:** `useSession` owns the arrays (chunks, suggestions, chat). It exposes a `processAudio(blob)` method that checks the `isRefreshing` guard, calls `/api/refresh`, and updates state.
*   **The Wiring:** In your main `Page` component, compose them by passing `useSession`'s handler into the recorder: 
    `const { processAudio } = useSession();`
    `const { start, stop } = useAudioRecorder({ onChunkReady: processAudio });`
*   **Batch Cap Enforcement:** Enforce the 5-batch cap inside the React state setter directly to avoid closure staleness: `setSuggestionBatches(prev => [newBatch, ...prev].slice(0, 5))`.

### 3) Common Next.js 14 Pitfalls (MediaRecorder & SSE)
*   **Browser API Hydration Errors:** `MediaRecorder` and `navigator.mediaDevices` will crash Next.js SSR. You must dynamically import your main recording component with `{ ssr: false }` or guarantee initialization only happens inside a `useEffect`.
*   **SSE Chunk Boundaries:** Native `fetch` stream readers (`response.body.getReader()`) do not guarantee that one network chunk equals one SSE event. A single chunk might contain multiple `data: {...}\n\n` payloads, or split a payload in half. You must buffer the string stream and split strictly by `\n\n`.
*   **API Route Caching:** Next.js 14 aggressively caches API GET requests. Because your routes are `POST`, they opt out of caching automatically, but ensure no `export const dynamic = 'force-static'` directives are accidentally applied to your API routes.

### 4) Final Verification Checklist
*   [ ] **No Mobile/Libraries:** Verify `globals.css` contains zero media queries and `package.json` contains no component libraries (Tailwind, shadcn, etc.).
*   [ ] **The 30-Second Loop:** Monitor the network tab. Verify exactly one `POST /api/refresh` occurs every 30 seconds while recording, containing a valid WebM blob > 1000 bytes.
*   [ ] **Empty State Guard:** Ensure the UI shows "Recording… first suggestions appear after 30 seconds" and explicitly prevents `/api/suggestions` from firing until the first chunk completes.
*   [ ] **Settings Modal Auto-Mount:** Clear `localStorage` and verify the settings modal forcibly opens on page load blocking all other actions.
*   [ ] **Export Integrity:** Click "Export Session" and validate the downloaded JSON perfectly matches the schema in `lib/export.ts`.
*   [ ] **Production Build:** Run `npm run build` and ensure it completes with zero type errors or linting failures. Verify the Docker container starts and serves the app successfully.

```

## Concise summary

Provider completed successfully. Review the raw output for details.

## Action items

- Review the response and extract decisions you want to apply.
- Capture follow-up implementation tasks if needed.
