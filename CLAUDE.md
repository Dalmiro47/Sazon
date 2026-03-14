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
id           uuid PK default gen_random_uuid()
name         text NOT NULL (2-300 chars)
slug         text UNIQUE NOT NULL (auto-generated, immutable after creation)
category     text NOT NULL — enum: main, starter, dessert, snack, breakfast, side, sauce, drink
servings     integer NOT NULL default 2 (1-100)
source       text (max 200 chars)
ingredients  jsonb NOT NULL default '[]' — array of Ingredient objects
steps        jsonb NOT NULL default '[]' — array of RecipeStep objects
notes        text (max 10,000 chars)
tags         text[] NOT NULL default '{}' (max 20 tags, each 1-50 chars, lowercased)
image_url    text (must start with http:// or https://, max 2000 chars)
created_at   timestamptz NOT NULL default now()
updated_at   timestamptz NOT NULL default now() — DB trigger only
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

## Constraints (non-negotiable)
- Constraints are hard guardrails, not problems to solve
- Historical bugs mentioned as context = things to avoid, always
- Minimum viable plan: match the stated UX outcome with the minimum change needed
- Do not add scope (refactors, extra configurability) unless explicitly asked
- When proposing UX changes, separate effects/polish (welcome) from structural/layout changes (require explicit approval)

## App Language
Spanish