# TwinMind Live Suggestions Implementation Plan

## Execution slices

### Slice A — project scaffold + server routes
- Scaffold Next.js 14 project files and configs
- Implement shared types/prompts/export helpers
- Implement `/api/transcribe`, `/api/suggestions`, `/api/chat`, and `/api/refresh`

### Slice B — client hooks + components
- Implement `useAudioRecorder` and `useSession`
- Implement `SettingsModal`, `SuggestionCard`, `TranscriptPanel`, `SuggestionsPanel`, and `ChatPanel`
- Wire `src/app/page.tsx` and `src/app/layout.tsx`
- Match the provided desktop mockup with vanilla CSS

### Slice C — docs + packaging + verification
- Add Docker assets, env example, README, and ignore file
- Install dependencies, run `npm run build`, and fix issues

## Verification targets

- `npm run build`
- Fresh inspection of API key priority logic and localStorage-only settings persistence
- Confirm batch cap, theme persistence, export shape, and SSE parsing behavior in code
