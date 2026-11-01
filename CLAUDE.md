## Constraints

Universal rules (`CONSTRAINTS.md`) load through the dds plugin import in `~/.claude/CLAUDE.md`; this repo has no copy. This repo's rules are under `## Project constraints`. These rules are non-negotiable: if a task conflicts with one, stop and surface the conflict, never resolve it silently.

# Sazón — Household Recipe App

Recipes, AI import and suggestions, and a cooking chat that proposes an improved recipe after each cook.
All user-facing text is in Spanish.

## Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript check (run before every commit)
npx tsc --noEmit && npm run lint  # Full pre-commit validation
```

## Stack and environment
- Next.js 14 App Router, TypeScript, Tailwind CSS, Shadcn UI (`src/components/ui/`)
- Supabase: the production Supabase project is shared with Open Brain
- Groq via the OpenAI SDK, all calls through `groqChat()` in `src/lib/groq.ts`: `qwen/qwen3.8-27b` for text + vision with `reasoning_effort: 'none'`; text-only fallback `openai/gpt-oss-120b` with `'low'` (ADR-8)
- `.env.local` names: `GROK_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_PIN`

## Map
- `src/app/`: routes; `actions/` holds the server actions; `/auth` plus `src/middleware.ts` is the PIN gate
- `src/lib/`: `validate-recipe.ts`, `sanitize-import.ts`, `import-recipe-prompt.ts`, `slugify.ts`, `html-to-text.ts` (no npm dep, truncates at 8000 chars; ADR-4), `supabase/`
- `src/components/recipe/`: feature components
- `src/types/`: `recipe.ts` (row and JSONB shapes), `constants.ts` (categories, units)
- `supabase/migrations/`: columns and DB checks; app-level limits are in `src/lib/validate-recipe.ts`
- `next.config.mjs`: `serverActions.bodySizeLimit: '5mb'` for image payloads
- `tests/playwright/`; `/playwright` (`.claude/commands/playwright.md`) runs the suite for the current feature, creates a spec if none exists, auto-corrects until all pass
- `/dds:brain-sync`: dds-kit plugin skill, captures a session-state milestone
- `.claude/dds-guard.json`: Supabase command guard
- `docs/decisions.md`: the whys (ADR-n); `docs/future-improvements.md`: pending ideas

## Glossary
- **Cooking session**: AI chat while cooking one recipe (`cooking_sessions`); ends in a summary and an improved-recipe proposal
- **Fit/fat tag**: `fat` if > 450 kcal per serving, or > 20 g fat, or indulgent ingredients; `fit` if ≤ 450 kcal and ≤ 20 g fat and mainly lean protein, vegetables, legumes or whole grains; in doubt, `fat`
- **Import modes** (`/recipes/import`): Foto (vision model, base64 ≤ 4MB), Enlace (server-side fetch + HTML strip, or the transcript of a YouTube link), Texto (raw paste ≤ 10k chars)
- **Slug**: unique URL id built from the name; soft-deleted rows keep theirs, so they still collide
- **Soft delete**: `deleted_at` set on the row; null = active
- **Macros**: `*_per_serving` calories, protein, fat, carbs; nullable, ≥ 0; LLM-estimated (ADR-3)

## Standards

**App language:** all user-facing text must be in Spanish: UI labels, buttons, error messages, validation feedback, placeholder text, toast notifications. Code comments and variable names remain in English.

**Code**
- No `any`: use interfaces from `src/types/`. Absolute imports: `@/components/...`, `@/lib/...`, `@/types/...`
- Server Components by default; `'use client'` only for hooks/event listeners
- Add Shadcn components via `npx shadcn@latest add [component-name]`. New icons use `size={20}`; existing icons drift (mostly 16)
- Mobile-first: design for 375px+, then adapt with `md:` / `lg:`
- Always run `npx tsc --noEmit` before declaring a task complete

**Database**
- Use `@/lib/supabase/server` for Server Components and Server Actions, `@/lib/supabase/browser` for Client Components, `@/lib/supabase/admin` for service-role operations
- Today the recipe and session actions and the `/recipes/[slug]` pages use admin, `suggest-recipe.ts` and `suggest-ideas.ts` use server, nothing imports browser
- RLS is enabled on both tables; there are no policies, so only the service-role client on the server can reach them
- `updated_at` is owned by a DB trigger: never set it in application code
- Avoid N+1: use joins or batch queries

**Recipe writes**
- `validateRecipePayload()` is one shared function, zero duplication; its only caller is `upsertRecipeAction`, which every write path uses
- Slug is always generated server-side from name, never typed or sent by the caller, immutable after creation; stripped from UPDATE payloads in code, not by convention; collisions auto-append `-2`, `-3`, ... on every create path
- `ingredients` and `steps` are atomic on update: full replace or untouched, no element merge
- If `qty` is null, `unit` MUST be null. Step order is renormalized to [1, 2, 3, ...] server-side before every write

**Cooking sessions**
- Append-only, no `updated_at`: always write the full `messages` array, never partial updates; `summary` is set once at session end, never updated
- `endSessionAction` returns a proposal, never auto-saves; the user must confirm via `upsertRecipeAction` (ADR-6)
- The latest 5 session summaries of the recipe go into the AI system prompt so knowledge accumulates across cooks (ADR-7)
- Chat markdown uses a custom inline renderer, no library: `**bold**`, `*italic*`, bullet/numbered lists (ADR-1)

**Import and AI**
- `sanitizeImportedRecipe()` in `src/lib/sanitize-import.ts` is the single post-processing step for AI-extracted recipes: normalizes units and categories, filters empty rows; always call it after JSON.parse in import actions. Suggest, refine and session-end output skips it and meets the validator on save
- `src/lib/import-recipe-prompt.ts` is shared: same schema for all 3 modes; always estimates macros and assigns fit/fat
- AI always assigns `fit` or `fat` to every recipe (import, suggest, refine) and idea; the grid has filter chips for both

**Browser state**
- Servings scaling is UI-only: no scaled value ever enters a Server Action call
- `recipe-progress-{slug}`: step done-state in `localStorage`, no server involvement
- `cooking-session-{recipeId}`: active session in `localStorage`, auto-resumed on page load, cleared when the session ends
- `import-recipe-draft`: draft for RecipeForm in `localStorage`, set before `router.push('/recipes/new')`, read+cleared on mount only when the `recipe` prop is undefined

**Playwright**
- Never run tests unless explicitly instructed with the phrase "run playwright"; never add runs to the default dev workflow or pre-commit hooks
- Tests live in `/tests/playwright/` and run only on demand
- Always assertion/test spec mode (pass/fail), never screenshot-only; the screenshot approach is prohibited: Claude reads test output directly, no human review loop

**Session workflow:** work on the feature/fix. When work is done, remind the owner to run `/playwright` (or say "run playwright"). `/dds:brain-sync` runs when the owner asks; every task prompt asks for it before the commit.

### Gotchas (learned the hard way)
- Radix Select: never set the initial value via `useEffect` + `setState`; use a `useState(() => ...)` lazy initializer (ADR-5)
- Macro inputs: validated server-side only, never `min={0}` on the HTML input (ADR-2)
- `GROK_API_KEY` is the Groq key, despite the spelling
- Vision has no fallback: `gpt-oss-120b` cannot read images (ADR-8)
- Playwright `baseURL` is port 3001 with no `webServer`, while `npm run dev` defaults to 3000: the app must already be running on 3001

## Project constraints
- Constraints are hard guardrails, not problems to solve
- Historical bugs mentioned as context = things to avoid, always

### Error Handling
- Every server call must handle failure with a clear, friendly Spanish message — never a blank screen or unhandled crash
- Loading states must always be visible to the user during async operations

### Security
- Row-level security must be enabled — each user may only access their own data
- Never log user emails, session data, or any PII to console or external services
- Secret keys and service role keys must live in environment variables only — never in source code or chat

### Scale Expectation
- This is a household app (1–5 users). Do not over-engineer for scale. Optimize for simplicity and readability over performance

### Destructive Operations
- Before ANY destructive or irreversible operation, follow CONSTRAINTS.md 4 (snapshot, then ask): do NOT execute directly. First confirm a recent Supabase backup/snapshot exists; if none does, STOP and ask the owner to create it (never run anything against Supabase yourself). Then STOP and ask for explicit confirmation, stating: (a) exactly what will be affected, (b) why it's irreversible, (c) what backup/rollback exists
- Covers (non-exhaustive): dropping/truncating `recipes` or `cooking_sessions` tables; mass/unscoped DELETE or UPDATE; hard-deleting rows instead of using the `deleted_at` soft-delete; schema migrations that drop columns or data; deleting files or directories (`rm -rf`); overwriting production data; force-pushing or rewriting git history on shared branches; destructive Supabase CLI/API calls against the production instance (shared with Open Brain)
- `supabase db reset`/`db push`, `secrets set`/`unset`, `functions deploy`/`delete`, `migration repair`, and the remote admin commands `config push`, `storage rm`/`mv`/`cp`, `backups restore`, `projects delete`, `branches delete` and `migration up --linked`/`--db-url` are denied by the dds guard (`.claude/dds-guard.json`), as is any access to `supabase/.temp/`; the owner runs them from their own terminal after the backup and confirmation above
- "I'll just do it quickly" is not a reason to skip this. Speed is exactly the risk

### Working Rules
- Keep this file under 300 lines. Every line must earn its keep.
- Minimum viable plan: match the stated UX outcome with the minimum change needed
- Do not add scope (refactors, extra configurability) unless explicitly asked
- When proposing UX changes, separate effects/polish (welcome) from structural/layout changes (require explicit approval)

## Brain sync

- Topics: sazon, Next.js, Supabase