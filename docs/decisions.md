# Decisions — Sazón

The whys behind the rules in [CLAUDE.md](../CLAUDE.md). Each date is the commit that first recorded the decision. "None recorded" means the repo documents no reason or alternative; nothing has been inferred.

## ADR-1: Custom chat markdown renderer

- **Date:** 2026-03-15
- **Decision:** AI chat responses are rendered by a custom inline renderer in `src/components/recipe/cooking-session.tsx`. It handles bold, italic, and bullet and numbered lists.
- **Why:** None recorded beyond that scope.
- **Alternatives:** Rejected: a markdown library (the rule says "no library"; no specific one is named).

## ADR-2: No HTML `min` on macro inputs

- **Date:** 2026-03-15
- **Decision:** Macro fields are validated server-side only; `min={0}` is never used on their inputs.
- **Why:** The browser would show validation errors in English; the server returns them in Spanish.
- **Alternatives:** Rejected: `min={0}` on the HTML input.

## ADR-3: LLM-estimated macros, USDA lookup pending

- **Date:** 2026-04-04
- **Status:** Pending, as [future-improvements.md](future-improvements.md) records it. The USDA option has not been rejected.
- **Decision:** Macros are estimated by the LLM with step-by-step instructions and reference values (`src/lib/import-recipe-prompt.ts`).
- **Why:** The proposal reports about 36% average calorie error for LLMs, and lists open problems for a lookup: unit normalization, ingredient matching, ingredients without data, and "al gusto" quantities.
- **Alternatives:** Pending: USDA FoodData Central lookup, with the LLM kept for normalization and everything else.

## ADR-4: HTML to text with no npm dependency

- **Date:** 2026-03-17
- **Decision:** `src/lib/html-to-text.ts` strips HTML with plain string replacement and truncates at 8000 characters.
- **Why:** "Intentionally simple — no npm dependency needed" (comment in the file).
- **Alternatives:** Rejected: an npm dependency (none named).

## ADR-5: Radix Select initial value through a lazy `useState`

- **Date:** 2026-03-17
- **Decision:** Read initial values with a `useState(() => ...)` lazy initializer, synchronously before first render.
- **Why:** Radix fixes its internal state on first render.
- **Alternatives:** Rejected: `useEffect` + `setState`.

## ADR-6: Session end proposes, never auto-saves

- **Date:** 2026-03-15
- **Decision:** `endSessionAction` returns an improved recipe; it is written only when the user confirms, through `upsertRecipeAction`.
- **Why:** The user must confirm changes to a recipe.
- **Alternatives:** Rejected: saving automatically.

## ADR-7: Past session summaries go into the prompt

- **Date:** 2026-03-15
- **Decision:** `chatInSessionAction` injects the latest 5 summaries for the same recipe into the system prompt.
- **Why:** Knowledge accumulates across cooks.
- **Alternatives:** None recorded.

## ADR-8: `groqChat()` as single entry point, with a text-only fallback

- **Date:** 2026-10-11
- **Decision:** Every Groq call goes through `groqChat()` in `src/lib/groq.ts`, using `qwen/qwen3.8-27b`. It falls back to `openai/gpt-oss-120b` for text when the main model is gone (404, `model_not_found`, `model_decommissioned`). Vision calls have no fallback. This replaced `llama-3.3-70b-versatile` for text and `meta-llama/llama-4-scout-17b-16e-instruct` for vision.
- **Why:** A model can be removed, and `gpt-oss` cannot read images. `reasoning_effort: 'none'` disables Qwen thinking. The reason for changing models: none recorded.
- **Alternatives:** None recorded.

## ADR-9: Soft delete with `deleted_at`

- **Date:** 2026-03-14
- **Decision:** Deleting a recipe sets `deleted_at`; null means active (`supabase/migrations/002_add_deleted_at.sql`).
- **Why:** None recorded. `## Project constraints` in CLAUDE.md treats hard deletes as destructive.
- **Alternatives:** None recorded.

## ADR-10: Universal constraints through the plugin import, no repo copy

- **Date:** 2026-11-01
- **Decision:** `CONSTRAINTS.md` loads through the dds plugin import in `~/.claude/CLAUDE.md`, and this repo drops its exported copy.
- **Why:** dds 0.10.0 loads it from the plugin. Section numbers in `.claude/dds-guard.json` and `## Project constraints` stay valid.
- **Alternatives:** Superseded: the exported copy, in place since commit `59d9239` (2026-10-11).

## ADR-11: Docs as map

- **Date:** 2026-11-01
- **Decision:** Following the dds-kit 0.9 standard, CLAUDE.md is a map, gotchas take one line each, longer whys live in this file, and README.md is a short map.
- **Why:** None recorded beyond the standard.
- **Alternatives:** None recorded.

## ADR-12: PIN check in every Server Action, closed in production without a PIN

- **Date:** 2026-11-07
- **Decision:** Every Server Action except `loginAction` and `logoutAction` calls `requireAuth()` (`src/lib/auth.ts`) first. Middleware and actions share `checkPin()` from `src/lib/auth-pin.ts`. When `AUTH_PIN` is unset, `NODE_ENV === 'production'` keeps the app closed (redirect to `/auth`); dev stays open.
- **Why:** The actions use the service-role client, so the check must not depend on the middleware alone. Middleware runs on Edge, with no `next/headers` and no `node:crypto`: hence a separate pure helper file and a plain-JS constant-time compare. `NODE_ENV` works on any host and also closes preview builds.
- **Alternatives:** Rejected: `VERCEL_ENV` (exists only on Vercel); a 503 when `AUTH_PIN` is missing (the redirect keeps the friendly `/auth` page); one `auth.ts` imported by the middleware.

## ADR-13: No end-to-end test suite

- **Date:** 2026-11-07
- **Decision:** Playwright was removed: the dependency, its config, the specs and the `/playwright` command. The owner tests by hand after deploy.
- **Why:** The owner does not use it.
- **Alternatives:** None recorded.
