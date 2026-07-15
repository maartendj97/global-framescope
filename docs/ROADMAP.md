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
- [x] Real news-source ingestion — GNews primary (with daily budget guard), Currents backup, direct state-media RSS feeds (TASS, Xinhua, CGTN, China Daily, IRNA), EU-sanctions publisher filter, all cached in shared Upstash Redis (`src/lib/cache.ts`; events pool 3h, per-event records 7d, coverage 24h, feeds 20min)
- [ ] AI-supported analysis — the big open piece: live events currently show real article lists but no framing analysis; per-country framing only exists as mock data for the 3 Phase 1 events
- [ ] Administration and content management

In progress (ingestion + API routes landed ahead of the original phase order; testing landed too — Vitest, unit tests for the pure pipeline logic). Database, auth, AI analysis, and admin remain unstarted — do not begin those until explicitly requested.
