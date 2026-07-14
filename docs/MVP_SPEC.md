# MVP Spec

Product source of truth. If in doubt about *what* to build, this file wins over assumptions or chat history.

## Product vision

Global FrameScope is a mobile-first application that lets users compare how the same major international event is framed by media perspectives from different countries.

**Tagline:** "One event, viewed through multiple national perspectives."

It is an **analysis and comparison product**, not a traditional daily-news application. Users primarily consume:

- neutral event context
- country-specific framing analysis
- important differences between countries
- terminology and tone analysis
- references and links to original sources

Users do **not** primarily read complete news articles inside the application.

Long-term direction: native apps for the Apple App Store and Google Play Store, supported by a website. The cheapest and most practical first step is a mobile-first Next.js web app that feels like a native app.

## Product principles

- Analysis-first, not article-first.
- Major international events only; quality over quantity.
- Compare perspectives without claiming complete neutrality.
- Avoid language that labels one national perspective as automatically true, false, or propaganda.
- Show original source links whenever they are available.
- Do not reproduce full copyrighted articles.
- Human review remains important when real analysis is introduced later.

Preferred wording: "we compare perspectives," "we show how different countries frame the same event," "we show sources where possible," "you decide."

Avoid: "we provide the truth," "we remove all bias," "this country lies," "this is propaganda."

## MVP strategy (three phases)

### Phase 1 — UI + mock data (current phase)

Build a polished mobile-first web application using mock data only.

Included:

- Complete app shell and navigation
- Home, Events, Event Detail, About, and Settings pages
- Country selection and framing-detail interaction
- Key Differences section
- Light theme and dark theme
- Three illustrative international events, all eight fixed MVP countries on every event
- TypeScript domain model, mock data, and data-access layer (done — see [ARCHITECTURE.md](ARCHITECTURE.md))

Explicitly **excluded** from Phase 1:

- real database
- external news APIs
- AI integrations
- authentication
- payments
- push notifications
- native mobile functionality
- admin/content-management tooling

The architecture must still allow mock data to be replaced by database/API calls later without rewriting the UI (see [ARCHITECTURE.md](ARCHITECTURE.md)).

### Phase 2 — Validate and improve

- the domain model
- event content structure
- country framing structure
- source structure
- comparison methodology

### Phase 3 — Real backend

- backend and database
- API routes
- authentication
- real news-source ingestion
- AI-supported analysis
- administration and content management

Do not implement Phase 2 or Phase 3 work unless explicitly requested.

## Navigation (MVP)

Bottom navigation, exactly 4 items:

1. Home
2. Events
3. About
4. Settings

There is no standalone, cross-event Sources page, and no dedicated Sources tab within Event Detail either. Each country's sources live inside that country's own Country Perspective view (reached from the Countries tab). About explains sourcing/methodology at a product level instead of duplicating a global source browser.

- Active item gets a rounded pill-style highlight.
- The whole bottom nav is rounded and reads as a floating mobile-app nav bar.
- **Event Detail is not a nav item.** Users reach it by tapping an event card from Home or Events.

Full behavior and flow: [UI_FLOW.md](UI_FLOW.md).

## Home page

Purpose: immediately explain the product and surface the main analyses.

- Global FrameScope branding
- Intro line: "Compare international framing, country by country"
- A featured "Today's major events" card, followed by an "Other events" section (same-size cards as the featured one, with a slightly smaller title/summary + a "View all" link to the Events page)
- Event cards show: image, category and date, title, concise summary, visible country indicators for the eight countries, source count and/or updated info, and a clear affordance to open Event Detail
- Do not show detailed country framing directly on Home cards
- Mobile bottom navigation

## Events page

Purpose: show the complete event catalogue.

- Page title, with a search icon in the header (omit rather than ship non-functional — see product principles)
- Complete list of the current event pool, as compact cards or rows — up to 10 with live data, falling back to the 3 Phase 1 mock events if live data is unavailable
- Category/date metadata, countries, and source count per event
- Optional category-filter chips when they add real value
- Selecting a card opens Event Detail
- Home shows the top 5 most recent events; the Events page shows the full pool (up to 10)

## Event Detail page

This is the central MVP experience. It is a **tabbed** screen — Overview, Countries, Differences — not one long scrolling page.

1. **Overview tab** (default): back navigation, event image, category/region/type tags, event title, published date, neutral summary, broader event context, and a short "Perspectives" line noting the country count as a teaser toward the Countries tab. Countries are not duplicated as a grid here — see the Countries tab.
2. **Countries tab**: all eight countries listed as rows (flag, name, one-line main-frame label, tone badge). Tapping a row opens a full **Country Perspective** view for that country.
3. **Differences tab**: a comparison table, one row per country, with Main frame and Tone columns.

### Country Perspective (opened from the Countries tab)

Its own screen with back navigation: country header + tone badge, main frame, narrative summary, a tone description, key focus points, terminology/wording used, an Emphasized/Downplayed comparison (maps to `highlighted`/`omitted`), and the sources used for that country's framing — deliberately substantial enough that the user gets real context without needing to click out to a source link.

### Country-selection behavior

- No country's framing is shown on first load — the user must open the Countries tab and tap a country
- Opening a different country replaces the previous Country Perspective view; only one country's framing is ever open at a time
- Selected/unselected and tone-badge states must be visually clear in both light and dark mode (see [UI_DESIGN.md](UI_DESIGN.md))

## Fixed MVP countries

Fixed base set for MVP (do not add/remove without a product decision):

- Netherlands
- United States
- Russia
- China
- India
- Iran
- Ukraine
- Germany

Architecture should allow the available country set to become event-specific later (i.e. not every event needs all 8).

## Country framing structure

A country framing can contain:

- main narrative
- key emphasis
- tone
- terminology / wording
- what is highlighted
- what is minimized or omitted
- source references

## Key Differences

Purpose: provide a fast cross-country comparison without telling users what to think. Helps users compare perspectives **without** declaring any single national perspective automatically correct.

Presented as a compact comparison table (one row per country, Main frame and Tone columns) inside Event Detail's Differences tab — not a separate bottom-navigation destination. The table scrolls horizontally within its own container on narrow screens rather than the whole page scrolling sideways.

## About page

Real nav item, and a real polished MVP screen — not a disabled placeholder. Purpose: build trust and explain the product, without duplicating a full cross-event source browser (per-country sources live in each country's Country Perspective view — see [Key Differences](#key-differences) above and [Event Detail page](#event-detail-page)).

Content, as honest informational rows/sections:

- About Global FrameScope (what the product is and isn't — ties back to [Product principles](#product-principles))
- Our method / how perspectives are compared
- Data & sources: what a source record represents (article/report title, publisher, country, type, date, link), and a visible note that Phase 1 content and publishers are illustrative mock data — a short explanation, not a browsable list of every source
- Privacy note
- Support / contact or feedback
- App version

Do not add fake working controls. Full source-management functionality (a real, filterable, cross-event source browser) is a later phase, not part of this page.

## Settings page

Settings is a real, polished screen, deliberately narrow in scope now that About owns the informational content.

**Functional MVP setting — Appearance**: Light / Dark. On first visit (no stored choice yet), the OS color-scheme preference is snapshotted once as the initial theme; from then on it's an explicit, fixed choice — persisted locally in the browser (no account required), applied across all routes, avoiding a visible flash of the wrong theme on load where reasonably possible.

No other settings in Phase 1 — no fake working controls for features that don't exist yet. Language, notifications, country preferences, and accounts belong to later phases. (Language: English and app version, if shown, live on the About page instead — see above.)

## Design direction

Mobile-first, premium editorial character (calm, rounded, high-contrast light/dark themes required). The complete visual specification — typography, color tokens, layout system, and per-page visual rules — lives in [UI_DESIGN.md](UI_DESIGN.md).

## Acceptance criteria for the complete Phase 1 MVP

- All five routes render without errors
- Bottom navigation works and highlights the active tab
- Home and Events use the data-access layer
- Each event opens the correct Event Detail page
- All eight countries are visible on every event
- No framing details are shown until a country is selected
- Only one country's framing is shown at a time
- Key Differences are readable on a small mobile screen
- Sources are visible in framing context via each country's Country Perspective view; About explains sourcing and methodology
- Settings allows Light and Dark appearance selection, persisted locally, seeded from the OS preference on first visit
- Light and dark modes are visually complete and accessible
- TypeScript validation, ESLint, and the production build all pass
- The experience remains usable from small mobile widths through desktop
