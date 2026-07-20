# Roadmap

Phase tracker. Full requirements per phase live in [MVP_SPEC.md](MVP_SPEC.md). Update the checkboxes as work lands — this file should reflect actual repo state, not intent.

## Phase 1 — UI + mock data

- [x] Domain types (`Event`, `CountryFraming`, `Source`, `Country`, `KeyDifference`)
- [x] Mock data for 3 example events, fixed 8-country set
- [x] Data-access layer (`getEvents`, `getEventById`, `getCountryFraming`, `getSources`, ...)
- [x] Documentation foundation (CLAUDE.md, README, MVP_SPEC, ARCHITECTURE, UI_FLOW, UI_DESIGN)
- [x] Design tokens and theme foundation (light/dark CSS variables, `next/font/google` for Playfair Display + Inter, Light/Dark mechanism in `src/lib/theme.ts` seeded once from the OS preference)
- [x] App shell and floating bottom navigation (Home, Events, About, Settings; active pill state)
- [x] Home page (featured event card, "Other events" list, `/events/[id]` stub for card links)
- [x] Events page (full 3-event catalogue, compact `EventCard` rows)
- [x] Event Detail page: Overview/Countries/Differences tabs (the separate Sources tab was dropped — per-country sources live inside Country Perspective), Countries-tab drill-down into Country Perspective
- [x] Key Differences comparison table (within Event Detail's Differences tab)
- [x] About page (product info, methodology, sourcing note — no cross-event source browser)
- [x] Settings page with Light/Dark appearance (local persistence, seeded from the OS preference on first visit)
- [x] Responsive, accessibility, lint, typecheck, and build validation pass

**Phase 1 is complete.** Every item above is built and verified (type-check, lint, and production build all pass; checked on both phone and desktop widths, in both light and dark mode).

## Phase 2 — Validate and improve

- [ ] Revisit domain model based on Phase 1 learnings
- [ ] Revisit event content structure
- [ ] Revisit country framing structure
- [ ] Revisit source structure
- [ ] Define comparison methodology more rigorously

Not started. Do not begin until Phase 1 is functionally complete and explicitly requested.

## Phase 3 — Real backend

- [ ] Backend and database
- [x] API routes — `/api/country-sources` (per-country live coverage) and `/api/event-sources` (aggregated per-event coverage)
- [ ] Authentication
- [x] Real news-source ingestion — GNews primary (with daily budget guard), Currents backup for the events pool, NewsData.io as a second per-country aggregator (tried when GNews's strict country search is empty; added for thin India coverage but usable for any country), direct state-media RSS feeds (TASS, Xinhua, CGTN, China Daily, IRNA), EU-sanctions publisher filter, all cached in shared Upstash Redis (`src/lib/cache.ts`; events pool 3h, per-event records 7d, coverage 24h, feeds 20min)
- [x] AI-supported analysis — per-country headline summaries on the Countries tab (`/api/country-summary`, claude-haiku-4-5, 24h Redis cache, single-flight lock, daily spend cap; requires `ANTHROPIC_API_KEY`), plus full per-country framing (tone, emphasis, terminology) and AI-synthesized key differences on the Differences tab (`/api/event-framing`, claude-sonnet-5, 24h Redis cache, daily spend cap; requires `ANTHROPIC_API_KEY`), replacing the Phase 1 mock framing data for live events
- [ ] Administration and content management

In progress (ingestion + API routes landed ahead of the original phase order; testing landed too — Vitest, unit tests for the pure pipeline logic). Database, auth, and admin remain unstarted — do not begin those until explicitly requested.

## Backlog — improvement candidates (2026-07-19)

Prioritized ideas along four axes (value, cost, safety, future-proofing). Not scheduled; pick per session. Items are ordered by suggested priority within each group.

### Product value

- [x] **Duplicate-event clustering** — done: `clusterArticles` (`src/lib/external/gnews.ts`) groups same-story headlines within a category by shared significant keywords (overlap-coefficient ratio ≥0.5, min 2 shared keywords) before mapping to events, so a story covered by multiple publishers becomes one event carrying a `sources: {publisher, url}[]` list instead of one card per publisher. Wired into the "N sources" badge on Home/Events cards via `getEventSourceCount` (`src/lib/eventDisplay.ts`), which also fixes those badges always reading 0 for live events (they only ever matched the mock `Source` records by id).
  - **Live spot-check, 2026-07-20:** forced an immediate pool refresh (bumped `EVENTS_POOL_KEY` to v2) to verify against real GNews results. Mixed: a "trade" trio (India-UK deal / India-EU deal / unrelated retail pricing) was correctly left as 3 separate events — no false merge. A "conflict" trio about the same Iran/US Strait of Hormuz story stayed split: two of the three headlines ("Escalating Conflict: U.S. and Iran's Struggle Over the Strait of Hormuz" and "Iran FM says peace talks with US were held under threat of bombing") share only one significant keyword ("Iran"), just under the min-2 threshold, so a real duplicate pair was missed. The third was a multi-story weekly roundup headline, arguably fine to keep separate. User decided (2026-07-20) to gather more real examples before tuning the threshold rather than adjust off one case — revisit once a few more live misses (or false merges) are observed.
- [x] **Surface "not covered by" as its own signal** — done, but implemented differently than planned: rather than parsing it out of the AI's prose (fragile — the current prompt doesn't even tell the model which countries were silent, so it can't reliably state it), `/api/event-framing` now computes `notCoveredBy: CountryCode[]` directly from coverage data (countries with zero fetched articles), independent of and more exact than anything the AI reports. Rendered as its own card on the Differences tab (`LiveDifferencesTab.tsx`, "Not covered by" + flag chips) whenever non-empty, even when there isn't enough coverage anywhere to generate framing at all.
- [x] **Cap articles per publisher in a country's source list** — done: shared `capPerPublisher` helper (`src/lib/external/articleCap.ts`, max 2 per publisher) applied to GNews strict + fallback tiers, NewsData.io, and the state-media feeds (relevant for China's 3 outlets). GNews/fallback now over-fetch (10 vs. displayed 5) so the cap has room to diversify instead of just truncating.
- [x] **Dutch-language coverage for NL** — done: `CATEGORY_QUERIES_NL` (`src/lib/external/gnews.ts`) is a hand-curated Dutch translation of the category phrases — GNews's `lang` filter narrows by language but doesn't translate `q`, so a plain `lang=nl` switch on the existing English phrases would have matched almost nothing. `fetchCountryCoverage` now merges NL's English and Dutch strict-tier results (dedup by URL, then the existing per-publisher cap) instead of only falling back to Dutch when English found zero, since English was returning a thin-but-nonzero count. Both AI prompts (`event-framing`, `country-summary`) now explicitly instruct the model to always respond in English regardless of source language. Not verified against live GNews data (no `GNEWS_API_KEY` in the local dev environment this was built in) — worth a live spot-check on NL coverage volume next time that key is available.
- [ ] **Events-pool cron refresh** — explicitly deferred (2026-07-20): the pool refreshes lazily on the first request after the 3h cache expires, so that visitor waits. A Vercel cron hitting a refresh endpoint would keep the pool warm, but at the cost of turning today's traffic-dependent GNews usage (zero calls when nobody visits, e.g. overnight) into a guaranteed 48 calls/day regardless of visitors — the opposite of what's wanted pre-launch with low real traffic. Revisit once there's enough live traffic that the wait is a real, observed UX problem, not a theoretical one.

### Cost

- Already controlled: daily caps on GNews (85), NewsData.io (150), AI summaries (300/day, Haiku) and framing (50/day, Sonnet); 24h Redis caches bound spend to distinct event+country pairs, not visitors. No action needed now; real-spend visibility belongs to the dashboard item below.

### Safety & future-proofing

- [x] **CI before deploy** — done: `.github/workflows/ci.yml` runs lint, typecheck (new `npm run typecheck` script), `npm test`, and `npm run build` on push to `main` and on every PR, Node 20. Verified the build succeeds with zero env vars set (all API calls are request-time in dynamic routes, none at build time), so CI needs no secrets. Doesn't block merges by itself (no branch protection configured) — it surfaces a red X on a broken commit, which is the gap this closes; enabling a required check is a separate, later step if wanted.
- [ ] **Observability dashboard** — visitors (use Vercel Analytics, built-in), API budget usage (GNews/NewsData/Anthropic counters already live in Redis, just not surfaced), per-country content-quality tiers (full-text vs description vs headline-only — guides sourcing work), and per-source error rates (already logged with `[gnews]`/`[currents]`/`[statefeeds]` prefixes; Vercel Hobby logs expire quickly, so nobody sees them today).
- [ ] **Credential storage before go-live** — adopt a password manager (1Password/Bitwarden), one entry per service (GitHub, Vercel, Anthropic, GNews, NewsData.io, Currents, Upstash); several keys currently exist only as one-time pastes. Naming convention for new tokens: `<service>-<purpose>-<device>-<yyyy-mm>`; short expiries (7–30d debug, 90d production with rotation reminder).
- [ ] **Pre-warm AI country summaries on pool refresh** — explicitly deferred (2026-07-17): latency polish only, slightly increases cost; revisit only if first-visitor latency becomes a real complaint.
