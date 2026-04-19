# Autopilot Validation Notes — TwinMind Live Suggestions

Date: 2026-04-19

## What reviewers flagged (and what changed)

### Functional / spec alignment
- **Recorder restart gap:** `useAudioRecorder` previously awaited `/api/refresh` completion before restarting the recorder, causing a recording gap. Fixed by restarting immediately on `onstop` and dispatching `onChunkReady` asynchronously.
- **Stale context risk:** recorder cycles could continue calling an old `onChunkReady` closure. Fixed by using refs for `onChunkReady` and `refreshIntervalSeconds`.
- **Suggestion failure dropping transcript:** `/api/refresh` previously returned 500 on suggestion failure (dropping a successful transcript). Fixed by treating suggestion generation as best-effort and returning `suggestions: []` while still returning the transcript chunk.
- **No API key behavior:** client now blocks refresh/chat calls without a key, opens settings, and re-opens settings on 401.
- **Mic permission denied:** transcript panel now shows an inline “Mic permission denied” error and disables the mic button after denial.
- **Whisper retry:** server transcription now retries once after a 2s delay in both `/api/transcribe` and `/api/refresh`.

## Security notes (constraints)

This app intentionally has **no auth** and supports reading a Groq API key from either a user header (`x-groq-key`) or `GROQ_API_KEY` env var (per `IMPLEMENTATION_PLAN.md`). This means:
- If deployed with `GROQ_API_KEY` and reachable publicly, the API routes can be abused as an unauthenticated relay.
- `npm audit` reports high-severity Next.js DoS advisories affecting the Next.js 14 line; upgrading to a fixed major would violate the "Next.js 14" constraint.

## Verification

- `npm run build`: PASS (after fixes)

