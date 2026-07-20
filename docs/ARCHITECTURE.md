# Architecture

Technical source of truth. Product requirements live in [MVP_SPEC.md](MVP_SPEC.md); this file covers how the code is organized.

## Confirmed stack

Inspect the repo before assuming anything has changed since this was written.

- **Next.js 16.2.10** — App Router, under `src/app/` (not root `app/`)
- **React 19.2.x**, **TypeScript 5** (`strict: true`)
- **Tailwind CSS v4** — CSS-first config, no `tailwind.config.ts`. Theme tokens are declared in `src/app/globals.css` via `@import "tailwindcss";` and an `@theme inline { ... }` block. Add/edit design tokens there, not in a config file.
- **ESLint 9**, flat config only (`eslint.config.mjs`), no `.eslintrc*`
- Path alias: `@/*` → `./src/*` (set in `tsconfig.json`)
- **Vitest** for unit tests (`npm test`) — node environment, pure-function tests for the pipeline/API logic; no component/UI test setup
- **@upstash/redis** — shared cache via `src/lib/cache.ts` (see Caching below); **rss-parser** for state-media feeds
- No state-management or data-fetching library installed. Don't add one unless it provides clear, immediate value — see AGENTS.md principle of not overengineering the MVP.
- Note: every npm script invokes its binary via `node` directly (`node node_modules/next/dist/bin/next dev`) because the local development path contains a colon, which breaks PATH-based `node_modules/.bin` resolution. Keep new scripts in that style.

### Next.js 16 vs. training data

AGENTS.md already flags that this Next.js version has breaking changes vs. typical training data. Two renames worth knowing before touching later-phase code:

- **Middleware → Proxy**: the file is now `proxy.js`/`proxy.ts`, not `middleware.ts`.
- **Cache Components**: caching/revalidation now goes through the `"use cache"` directive, `cacheLife()`, `cacheTag()`, `updateTag()` — not the older `revalidatePath`/`revalidateTag`-only model.

Always check `node_modules/next/dist/docs/` for the exact current API before writing code that touches routing, caching, or Server Actions.

### Caching (real, in production)

Next's own fetch cache was confirmed **not to work** on this Vercel setup (see the events-pool drift bug). All server-side caching goes through `src/lib/cache.ts` — a thin Upstash Redis wrapper (`getCached`/`setCached`) shared by every server instance, degrading gracefully to no-ops when the `KV_REST_API_*` env vars are absent (local dev). Current TTLs: events pool 3h, per-event records 7d, GNews coverage 24h, state RSS feeds 20min, GNews daily-usage counter 48h. Do **not** rely on `fetch` caching, `revalidate`, or `"use cache"` for anything that must actually be cached — use `src/lib/cache.ts`.

### Observability

`src/proxy.ts` (root-level, App Router matcher excludes `/api`, static assets, and metadata files) fires a Redis-backed visit counter (`src/lib/external/visitUsage.ts`) on every real page view via `event.waitUntil()`, so it never delays a response. Visitor identity is a salted SHA-256 hash of IP + calendar day (`VISIT_HASH_SALT`) — never a raw IP — added to a per-day Redis Set; `SCARD` gives the unique-visitor count. `GET /api/admin/metrics` (bearer-token gated by `METRICS_API_TOKEN`, 404s when unset) exposes visits plus the existing GNews/NewsData/Anthropic daily-usage counters as one JSON snapshot — the data source for the standalone dashboard app, deployed live at [framescope-observability-dashboard.vercel.app](https://framescope-observability-dashboard.vercel.app).

The dashboard lives in its **own separate GitHub repo** (`maartendj97/framescope-observability-dashboard`), not as a subfolder here — an earlier attempt at a monorepo subfolder (Vercel Root Directory) hit a Turbopack/Vercel root-detection conflict: Turbopack picked up this repo's `src/proxy.ts` and `postcss.config.mjs` as if they belonged to the dashboard build, and separately Vercel's output-tracing step mis-computed the `.next` output path. Splitting into a fully separate repo removed the shared-root ambiguity entirely. If the dashboard's source needs changes, clone/work in that repo directly.

## Layer separation

The codebase must keep these concerns separate so mock data can be swapped for real data sources later without rewriting the UI:

```
src/app/            route & page logic (App Router)
src/app/api/         route handlers (country-sources, event-sources)
src/components/      reusable UI components (presentational)
src/types/            TypeScript domain types (Event, CountryFraming, Source, ...)
src/data/             mock data (raw fixtures — not imported directly by UI)
src/lib/data/         data-access layer (getEvents, getEventById, ...)
src/lib/external/     news-source integrations (gnews, currents, stateFeeds, budget guard, sanctions filter)
src/lib/cache.ts      shared Upstash Redis cache wrapper
src/proxy.ts          visit-counter proxy (see Observability below) — NOT middleware.ts, see Next.js 16 vs. training data
```

The separation itself is a hard requirement, not a suggestion.

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

The fixed MVP country list (see [MVP_SPEC.md](MVP_SPEC.md#fixed-mvp-countries)) should not be hardcoded into UI components:

- the full country list is defined once — `ALL_COUNTRY_CODES` in `src/types/country.ts`; the mock `Country[]` records and both news sources derive from it,
- each event references a subset of countries (`availableCountries`), rather than assuming every event has framing for all 8 countries.

## What not to build yet

Already built (originally Phase 3 items, landed early): external news APIs (GNews, Currents, state-media RSS), shared Redis caching, API routes, and a Vitest test suite.

Still out of scope until explicitly requested: a real database, AI integrations (including AI-generated framing), authentication, payments, push notifications, and native mobile functionality. Do not introduce a state-management library or CSS-in-JS solution unless a concrete need arises — keep the dependency list close to what's already installed.

## Design tokens & styling

Mobile-first, Tailwind utility classes, rounded cards/controls, calm visual style (see [MVP_SPEC.md](MVP_SPEC.md#design-direction)). Shared design tokens (colors, spacing, radii used for the pill-nav, etc.) belong in the `@theme` block in `src/app/globals.css` so they're reusable across components rather than repeated as ad-hoc utility values. Actual token values (light/dark color tables, typography, layout scale) live in [UI_DESIGN.md](UI_DESIGN.md), not here.

## Theming & appearance

Light/dark theme is a confirmed Phase 1 requirement (Light / Dark, per [MVP_SPEC.md](MVP_SPEC.md#settings-page)). This section covers the mechanism only — see [UI_DESIGN.md](UI_DESIGN.md) for the actual token values.

- Represent the active theme with a `data-theme` attribute (or equivalent class) on the root element, driving CSS custom properties defined in `src/app/globals.css`.
- Store the user's explicit choice (`light` / `dark`) in `localStorage`; no backend or account involved.
- On first visit (no stored choice yet), snapshot the OS `prefers-color-scheme` once as the initial value — from then on it's a fixed explicit choice, not a live-following "system" mode.
- Use a small early/inline theme-initialization step so the correct theme applies before first paint, avoiding a flash of the wrong theme.
- Load Playfair Display and Inter via `next/font/google` — no extra font package needed.
- No new state-management dependency is needed for this — plain React state/context plus `localStorage` is sufficient at this scale.
