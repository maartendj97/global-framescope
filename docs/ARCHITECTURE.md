# Architecture

Technical source of truth. Product requirements live in [MVP_SPEC.md](MVP_SPEC.md); this file covers how the code is organized.

## Confirmed stack

Inspect the repo before assuming anything has changed since this was written.

- **Next.js 16.2.10** — App Router, under `src/app/` (not root `app/`)
- **React 19.2.x**, **TypeScript 5** (`strict: true`)
- **Tailwind CSS v4** — CSS-first config, no `tailwind.config.ts`. Theme tokens are declared in `src/app/globals.css` via `@import "tailwindcss";` and an `@theme inline { ... }` block. Add/edit design tokens there, not in a config file.
- **ESLint 9**, flat config only (`eslint.config.mjs`), no `.eslintrc*`
- Path alias: `@/*` → `./src/*` (set in `tsconfig.json`)
- No test framework, state management library, or data-fetching library installed yet. Don't add one unless it provides clear, immediate value — see AGENTS.md principle of not overengineering the MVP.

### Next.js 16 vs. training data

AGENTS.md already flags that this Next.js version has breaking changes vs. typical training data. Two renames worth knowing before touching later-phase code:

- **Middleware → Proxy**: the file is now `proxy.js`/`proxy.ts`, not `middleware.ts`.
- **Cache Components**: caching/revalidation now goes through the `"use cache"` directive, `cacheLife()`, `cacheTag()`, `updateTag()` — not the older `revalidatePath`/`revalidateTag`-only model.

Neither is relevant to Phase 1 (no data mutations, no caching needs with mock data). Relevant once Phase 3 introduces a backend. Always check `node_modules/next/dist/docs/` for the exact current API before writing code that touches routing, caching, or Server Actions.

## Layer separation

The codebase must keep these concerns separate so mock data can be swapped for real data sources later without rewriting the UI:

```
src/app/            route & page logic (App Router)
src/components/      reusable UI components (presentational)
src/types/            TypeScript domain types (Event, CountryFraming, Source, ...)
src/data/             mock data (raw fixtures — not imported directly by UI)
src/lib/data/         data-access layer (getEvents, getEventById, ...)
```

Exact folder names may be adjusted when Phase 1 implementation starts, but the separation itself is a hard requirement, not a suggestion.

### Data-access layer

The UI must not import files from `src/data/` (or wherever mock fixtures live) directly. All reads go through data-access functions, e.g.:

- `getEvents()`
- `getEventById(id)`
- `getCountryFraming(eventId, countryCode)`
- `getSources()`

In Phase 1 these functions read from local mock data and can be synchronous or return resolved Promises (to match the shape a future API/DB call will have). In Phase 3 their internals change to call a database or external API — their signatures and return types should not need to change, and calling code in components/pages should not need to change either.

### Domain types

Domain types (`Event`, `CountryFraming`, `Source`, `Country`, etc.) live in `src/types/` and are the contract between the data-access layer and the UI. Define these before writing mock data, so the mock data is shaped like the real thing will eventually be shaped.

## Country model

The fixed MVP country list (see [MVP_SPEC.md](MVP_SPEC.md#fixed-mvp-countries)) should not be hardcoded into UI components. Model it so that:

- the full country list is defined once (e.g. a `Country[]` constant or type),
- each event can reference a subset of countries (event-specific availability), rather than assuming every event has framing for all 8 countries.

## What not to build yet

Per the MVP strategy, do not add in Phase 1: a real database, external news APIs, AI integrations, authentication, payments, push notifications, or native mobile functionality. Do not introduce a state-management library, testing framework, or CSS-in-JS solution unless a concrete Phase 1 need arises — keep the dependency list close to what's already installed.

## Design tokens & styling

Mobile-first, Tailwind utility classes, rounded cards/controls, calm visual style (see [MVP_SPEC.md](MVP_SPEC.md#design-direction)). Shared design tokens (colors, spacing, radii used for the pill-nav, etc.) belong in the `@theme` block in `src/app/globals.css` so they're reusable across components rather than repeated as ad-hoc utility values. Actual token values (light/dark color tables, typography, layout scale) live in [UI_DESIGN.md](UI_DESIGN.md), not here.

## Theming & appearance

Light/dark theme is a confirmed Phase 1 requirement (System / Light / Dark, per [MVP_SPEC.md](MVP_SPEC.md#settings-page)). This section covers the mechanism only — see [UI_DESIGN.md](UI_DESIGN.md) for the actual token values.

- Represent the active theme with a `data-theme` attribute (or equivalent class) on the root element, driving CSS custom properties defined in `src/app/globals.css`.
- Store the user's explicit choice (`system` / `light` / `dark`) in `localStorage`; no backend or account involved in Phase 1.
- When set to `system`, resolve via `prefers-color-scheme` and keep it responsive to OS-level changes.
- Use a small early/inline theme-initialization step so the correct theme applies before first paint, avoiding a flash of the wrong theme.
- Load Playfair Display and Inter via `next/font/google` — no extra font package needed.
- No new state-management dependency is needed for this — plain React state/context plus `localStorage` is sufficient at this scale.
