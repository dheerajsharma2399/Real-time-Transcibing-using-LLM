## Task statement

Build the TwinMind Live Suggestions desktop web app exactly from `IMPLEMENTATION_PLAN.md` and the provided `image.png` mockup.

## Desired outcome

- Next.js 14 App Router app in TypeScript (non-strict)
- Vanilla CSS only
- Live microphone recording with 30-second MediaRecorder restart strategy
- Groq-powered transcription, suggestions, and streaming chat
- Settings persisted only in `localStorage`
- Dockerized deployment assets and README
- `npm run build` succeeds with zero errors

## Known facts / evidence

- Repository currently contains only `IMPLEMENTATION_PLAN.md`, `image.png`, and `.omx/` runtime data.
- The plan specifies exact file structure, data types, API key priority, API route behavior, prompts, state rules, UI layout, and build order.
- The mockup confirms a desktop-only dark default three-column layout with transcript, live suggestions, and chat.

## Constraints

- Follow the implementation plan exactly; do not add features.
- Do not use Tailwind, shadcn, or other UI libraries.
- Do not use Vercel-specific features.
- No auth, DB, or server-side session storage.
- No responsive/mobile CSS.
- Session state stays in memory; only settings persist in `localStorage`.

## Unknowns / open questions

- Exact npm package versions compatible with Next.js 14 and Groq SDK usage.
- Whether the local environment already has Node/npm dependencies cached.
- Final small implementation details for client/server boundaries and SSE parsing.

## Likely codebase touchpoints

- `package.json`, `tsconfig.json`, `next.config.js`, `.gitignore`
- `src/app/**/*`
- `src/components/**/*`
- `src/hooks/**/*`
- `src/lib/**/*`
- `Dockerfile`, `docker-compose.yml`, `.env.example`, `README.md`
