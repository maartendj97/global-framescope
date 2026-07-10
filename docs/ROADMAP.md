# Roadmap

Phase tracker. Full requirements per phase live in [MVP_SPEC.md](MVP_SPEC.md). Update the checkboxes as work lands — this file should reflect actual repo state, not intent.

## Phase 1 — UI + mock data

- [x] Domain types (`Event`, `CountryFraming`, `Source`, `Country`, `KeyDifference`)
- [x] Mock data for 3 example events, fixed 7-country set
- [x] Data-access layer (`getEvents`, `getEventById`, `getCountryFraming`, `getSources`, ...)
- [x] Documentation foundation (CLAUDE.md, README, MVP_SPEC, ARCHITECTURE, UI_FLOW, UI_DESIGN)
- [x] Design tokens and theme foundation (light/dark CSS variables, `next/font/google` for Playfair Display + Inter, System/Light/Dark mechanism in `src/lib/theme.ts`)
- [x] App shell and floating bottom navigation (Home, Events, About, Settings; active pill state)
- [x] Home page (featured event card, "Other events" list, `/events/[id]` stub for card links)
- [x] Events page (full 3-event catalogue, compact `EventCard` rows)
- [x] Event Detail page: Overview/Countries/Differences/Sources tabs, Countries-tab drill-down into Country Perspective
- [x] Key Differences comparison table (within Event Detail's Differences tab)
- [x] About page (product info, methodology, sourcing note — no cross-event source browser)
- [x] Settings page with System/Light/Dark appearance (local persistence)
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
- [ ] API routes
- [ ] Authentication
- [ ] Real news-source ingestion
- [ ] AI-supported analysis
- [ ] Administration and content management

Not started. Do not begin until explicitly requested.
