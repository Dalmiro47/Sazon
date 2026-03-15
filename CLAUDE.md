# Sazón — Household Recipe App

## Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Run ESLint
npx tsc --noEmit     # TypeScript check (run before every commit)
npx tsc --noEmit && npm run lint  # Full pre-commit validation
```

## Stack
- Next.js 14 App Router + TypeScript + Tailwind CSS
- Supabase (shared instance with Open Brain project)
- Shadcn UI (components in src/components/ui/)
- Grok API (via OpenAI SDK) for AI recipe suggestions

## Coding Standards
- No `any` — use interfaces from `src/types/`
- Absolute imports — use `@/components/...`, `@/lib/...`, `@/types/...`
- Server Components by default — add `'use client'` only for hooks/event listeners
- Shadcn UI: add components via `npx shadcn@latest add [component-name]`; icon size standard is `size={20}`
- Mobile-first: design for 375px+, then adapt with `md:` / `lg:` Tailwind prefixes
- TypeScript check before done: always run `npx tsc --noEmit` before declaring a task complete

## Database (Supabase)
- Use Supabase client from `@/lib/supabase/server` for Server Components and Server Actions
- Use Supabase client from `@/lib/supabase/browser` for Client Components
- Use admin client from `@/lib/supabase/admin` for service-role operations
- `updated_at` is owned by a DB trigger — never set it manually in application code
- Avoid N+1 patterns — use joins or batch queries

## Data Model — recipes table
```sql
id                   uuid PK default gen_random_uuid()
name                 text NOT NULL (2-300 chars)
slug                 text UNIQUE NOT NULL (auto-generated, immutable after creation)
category             text NOT NULL — enum: main, starter, dessert, snack, breakfast, side, sauce, drink
servings             integer NOT NULL default 2 (1-100)
source               text (max 200 chars)
ingredients          jsonb NOT NULL default '[]' — array of Ingredient objects
steps                jsonb NOT NULL default '[]' — array of RecipeStep objects
notes                text (max 10,000 chars)
tags                 text[] NOT NULL default '{}' (max 20 tags, each 1-50 chars, lowercased)
image_url            text (must start with http:// or https://, max 2000 chars)
calories_per_serving numeric (≥ 0, nullable)
protein_per_serving  numeric (≥ 0, nullable)
fat_per_serving      numeric (≥ 0, nullable)
carbs_per_serving    numeric (≥ 0, nullable)
created_at           timestamptz NOT NULL default now()
updated_at           timestamptz NOT NULL default now() — DB trigger only
```

## Data Model — cooking_sessions table
```sql
id         uuid PK default gen_random_uuid()
recipe_id  uuid NOT NULL references recipes(id) on delete cascade
messages   jsonb NOT NULL default '[]' — array of SessionMessage objects
summary    text (set once at end of session, never updated)
cooked_at  timestamptz NOT NULL default now()
```
No `updated_at` — sessions are append-only; summary is set once.

### SessionMessage schema (JSONB element)
```typescript
{ role: 'user' | 'assistant', content: string }
```

### Ingredient schema (JSONB element)
```typescript
{ qty: number | null, unit: string | null, name: string, note?: string }
```
Invariant: if `qty` is null, `unit` MUST also be null.

### RecipeStep schema (JSONB element)
```typescript
{ order: number, title: string, content: string, timer?: number }
```
Order is renormalized to [1, 2, 3, ...] server-side before every write.

## Spec Guardrails
- `validateRecipePayload()` is a single shared function — zero duplication between callers
- Slug is always auto-generated server-side from name — never typed or sent by the caller
- Slug is stripped from UPDATE payload before DB write — enforced in code, not by convention
- `updated_at` is never set manually — DB trigger only
- Servings scaling is UI-only — no scaled value ever enters a Server Action call
- Step done-state is `localStorage` key `recipe-progress-{slug}` — no server involvement
- `ingredients` and `steps` are atomic on update — full replace or untouched, no element merge
- Slug collision resolution: auto-append `-2`, `-3`, ... for both callers
- Macro fields (`*_per_serving`) validated server-side only — never use `min={0}` on HTML inputs (browser shows English errors); let server return Spanish validation messages
- Session messages are append-only — always write the full updated array, never partial updates
- `endSessionAction` returns an improved recipe proposal — never auto-saves; user must confirm via `upsertRecipeAction`
- Active cooking session is persisted in `localStorage` key `cooking-session-{recipeId}` — auto-resumed on page load, cleared when session ends
- Previous session summaries for the same recipe are injected into the AI system prompt so knowledge accumulates across cooks
- Markdown in AI chat responses is rendered via a custom inline renderer (no library) — handles `**bold**`, `*italic*`, bullet/numbered lists

## Constraints (non-negotiable)
- Constraints are hard guardrails, not problems to solve
- Historical bugs mentioned as context = things to avoid, always
- Minimum viable plan: match the stated UX outcome with the minimum change needed
- Do not add scope (refactors, extra configurability) unless explicitly asked
- When proposing UX changes, separate effects/polish (welcome) from structural/layout changes (require explicit approval)

## Playwright
- Never run Playwright tests unless explicitly instructed with the phrase "run playwright"
- Never add Playwright test runs to the default dev workflow or pre-commit hooks
- Tests live in /tests/playwright/ and are only executed on demand
- Always use assertion/test spec mode (pass/fail) — never screenshot-only mode
- Screenshot approach is prohibited: Claude reads test output directly, no human review loop needed

## App Language
Spanish

## Custom Commands
- `/playwright` — runs Playwright test suite for current feature; creates spec if none exists; auto-corrects until all pass
- `/brain-sync` — captures current session state to Open Brain MCP as a meeting_debrief thought

## Session Workflow
1. Work on feature/fix
2. Run `/playwright` when implementation is done
3. Run `/brain-sync` before ending the session