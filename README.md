# Sazón

A household recipe app, with all its text in Spanish. It keeps recipes, imports them from a photo, a link or pasted text, suggests new ones with AI, and offers a chat while you cook that proposes an improved recipe at the end.

Built with Next.js 14, TypeScript, Tailwind CSS, Shadcn UI, Supabase and the Groq API.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

The app reads these variables from `.env.local`: `GROK_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_PIN`. The database schema is in [`supabase/migrations/`](supabase/migrations/).

## Map

- [`CLAUDE.md`](CLAUDE.md): commands, code map, glossary, standards and constraints
- [`docs/decisions.md`](docs/decisions.md): why things are the way they are
- [`docs/future-improvements.md`](docs/future-improvements.md): pending ideas
- [`src/app/`](src/app/): routes and server actions
- [`src/components/`](src/components/): recipe components and UI components
- [`src/lib/`](src/lib/): Groq client, validation, import helpers, Supabase clients
- [`src/types/`](src/types/): shared types and constants
- [`tests/playwright/`](tests/playwright/): end-to-end tests
