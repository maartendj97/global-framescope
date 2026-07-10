# UI Design

Visual specification source of truth. Product requirements live in [MVP_SPEC.md](MVP_SPEC.md); navigation/flow logic lives in [UI_FLOW.md](UI_FLOW.md); the technical mechanism for theme switching lives in [ARCHITECTURE.md](ARCHITECTURE.md#theming--appearance). This file owns the actual look: typography, color tokens, layout system, and per-page visual rules.

## Design character

Global FrameScope should feel like a polished mobile editorial analysis app.

Confirmed character:

- Mobile-first
- Premium and editorial
- Calm and trustworthy
- Modern, but not a generic SaaS dashboard
- Strong typography
- Clear hierarchy
- Rounded cards and controls
- Soft shadows and restrained borders
- Minimal clutter
- Event visuals that support the story without creating breaking-news urgency
- Source transparency as a visible trust signal

Avoid:

- Chaotic news-feed layouts
- Overly bright or saturated palettes
- Social-media interaction patterns
- Excessive charts in Phase 1
- Sensationalist imagery

Note: an early draft of this document discouraged tables in favor of stacked cards for country comparison. That's been superseded — see [Key Differences UI](#key-differences-ui) below, which now uses a compact comparison table per an approved mockup.

## Typography

Use `next/font/google` — no extra font package required.

- Headings and editorial display text: **Playfair Display**
- Body, labels, buttons, metadata, and navigation: **Inter**

Recommended type scale:

| Role | Size / line height | Font | Weight |
|---|---|---|---|
| Display | 32px / 38px | Playfair Display | 700 |
| H1 | 28px / 34px | Playfair Display | 700 |
| H2 | 22px / 28px | Playfair Display | 700 |
| H3 | 18px / 24px | Inter (or Playfair Display when more editorial) | 600 |
| Body large | 17px / 26px | Inter | 400 |
| Body | 16px / 24px | Inter | 400 |
| Small | 14px / 20px | Inter | 400 or 500 |
| Metadata / label | 12px / 16px | Inter | 500 or 600 |

Keep line lengths readable and avoid oversized headings on narrow mobile screens.

## Light theme tokens

| Token | Value | Usage |
|---|---:|---|
| Primary navy | `#0D1B2A` | Primary text, buttons, active navigation |
| Secondary dark blue | `#1B263B` | Secondary surfaces and dark accents |
| Page background | `#F5F3EF` | App background |
| Card surface | `#FFFFFF` | Cards and elevated content |
| Gold accent | `#D4AF37` | Restrained highlights and selected accents |
| Soft blue-grey | `#A8B5C7` | Decorative/muted UI details |
| Border | `#E6E2DA` | Card and divider borders |
| Muted text | `#6B7280` | Secondary text and metadata |

Supporting tokens:

- Subtle surface: `#EEF1F4`
- Primary text: `#0D1B2A`
- Inverse text: `#FFFFFF`
- Focus ring: `#D4AF37` with sufficient offset
- Error: a restrained, accessible red, used only when a real error state exists

## Dark theme tokens

Dark mode is a confirmed MVP requirement — it must preserve the navy/gold editorial identity, not just invert the light theme.

| Token | Value | Usage |
|---|---:|---|
| Page background | `#07111E` | Main dark canvas |
| Card surface | `#0D1B2A` | Cards and content surfaces |
| Elevated surface | `#142238` | Navigation, selected panels, raised cards |
| Secondary surface | `#1B263B` | Alternative dark surface |
| Primary text | `#F7F4ED` | Main readable text |
| Muted text | `#A8B5C7` | Secondary copy and metadata |
| Border | `#2A3A4E` | Dividers and card outlines |
| Gold accent | `#D4AF37` | Brand accent |
| Strong gold | `#E0BE52` | Hover/focus when extra contrast is needed |

Dark-mode rules:

- Do not simply invert the light theme
- Keep card separation visible through borders and subtle elevation
- Use gold sparingly
- Prefer light text on dark surfaces, navy text on gold-filled controls
- Selected country chips and the active navigation pill must remain unmistakable

## Layout system

### Mobile baseline

- Design primarily for a viewport around 390px wide
- Support approximately 320px and above
- Main horizontal page padding: 16px
- Larger section gaps: 24px–32px
- Card internal padding: 16px–20px
- Use safe-area padding around the floating bottom navigation

### Desktop behavior

- Center the app content rather than stretching it across the full viewport
- Recommended main content max width: 960px
- Editorial text sections can use a narrower readable width
- Bottom navigation may remain app-like and centered, with a sensible max width

### Radius and elevation

- Large cards: 20px–24px radius
- Standard controls/cards: 16px–20px radius
- Country chips: fully rounded (`999px`)
- Bottom navigation: approximately 28px–32px radius
- Use soft, restrained shadows; borders should carry most of the structure in dark mode

## App shell and bottom navigation

Bottom navigation contains exactly: Home, Events, About, Settings (routes and flow: see [UI_FLOW.md](UI_FLOW.md)). There is no standalone Sources tab — per-event sources live inside each Event Detail's Sources tab; About covers sourcing/methodology at a product level.

Visual requirements:

- Floating above the page background
- Rounded container with clear separation from content
- Fixed or sticky near the bottom on mobile, safe-area aware
- Icon and readable label for every item
- Active item shown inside a rounded pill/badge, using the primary navy or a gold/navy combination while preserving contrast
- Inactive items remain visible but quiet
- The navigation must not cover page content — pages need sufficient bottom padding

Event Detail is reached through event cards and is not a navigation tab.

## Home page UI

**Header**: small Global FrameScope wordmark/brand line; main intro "Compare international framing, country by country"; optional short supporting line.

**Event presentation**: a "Today's major events" featured card (larger, can be part of a swipeable set if more than one is featured), followed by an "Other events" section with a "View all" link to the Events page and the remaining events as more compact rows. Cards use calm editorial images or local placeholder visuals with a consistent aspect ratio (16:9 or 3:2 preferred).

**Event card anatomy**: image; category and date row; event title; concise summary; compact country-indicator row for the seven countries; source count and/or update metadata; a clear chevron/arrow/click affordance. Do not show country framing detail on the card.

## Events page UI

Clear page title ("Events") with a search icon in the header; compact list or card layout; optional horizontal category chips (All, Conflict, Climate, Diplomacy); each row/card includes thumbnail, title, category/date, country count, source count, and chevron. Avoid filters that don't yet provide real value — the search icon can stay present but non-functional-looking only if it's genuinely wired up, otherwise omit it until it does something.

## Event Detail UI

Event Detail is a tabbed screen, not one long scroll. Top row: back button, optional share action. Below: event image; category/region/type tag chips; event title; published date; then a tab bar with 4 tabs — **Overview, Countries, Differences, Sources**.

**Overview tab**: neutral summary; broader context card/section; a **Countries included** preview grid (flag + name for all 7, non-interactive — the entry point into a country's framing is the Countries tab, not this grid).

**Countries tab**: all 7 countries as rows, not chips — flag, country name, a short one-line main-frame label, a tone badge, and a chevron, under the heading "Choose a country to view its perspective." Tone badges use restrained, distinct colors per category (see [Tone badge colors](#tone-badge-colors)) — e.g. Concerned, Cautious, Critical, Neutral, Balanced, Supportive. Tapping a row opens the Country Perspective view, not an inline expansion.

**Country Perspective** (opened from a Countries-tab row, own back navigation, optional share action): country header (flag + name) and a tone badge; **Main frame** (short label) and a fuller **narrative summary**; **Key focus** bullet points; a two-column **Emphasized** / **Downplayed** comparison (maps to the `highlighted` / `omitted` framing fields — Emphasized in restrained green, Downplayed in restrained red/rose, never color-alone); **Sources used** for this country's framing (publisher mark, name, published date, external-link icon). Use progressive hierarchy, not a wall of equally weighted text.

## Key Differences UI

The Differences tab shows a compact **comparison table**, not stacked cards (see the note in [Design character](#design-character)): one row per country (all 7); columns for Country (flag + name), Main frame, and Tone (as a colored badge, same palette as the Countries tab). The table scrolls horizontally *within its own container* if it doesn't fit the viewport — the page itself must never scroll horizontally. Keep row text short (a phrase, not a paragraph); link out to the Country Perspective view for the full narrative rather than repeating it here.

### Tone badge colors

Small, restrained, accessible-contrast pills — not saturated/alarming colors. Suggested mapping (exact hex values to be finalized against the light/dark token tables when built): Concerned → soft blue, Cautious → amber, Critical → restrained red, Neutral → grey, Balanced → green, Supportive → teal-green. Reuse this same badge style everywhere a tone appears (Countries tab rows, Country Perspective header, Differences table).

## About page UI

Use calm grouped cards/sections, similar visual language to Settings. Page title ("About"); a short "About Global FrameScope" intro (product pitch, tone matching [Product principles](../docs/MVP_SPEC.md)); an "Our method" / "How we analyze" section; a "Data & sources" section explaining what a source record represents and a visible note that Phase 1 content and publishers are illustrative mock data — this is an explanation, **not** a browsable list of every source (those live per-event in Event Detail's Sources tab); a privacy note; support/contact or feedback; app version. Do not present disabled fake toggles for features that don't exist.

## Settings page UI

Use calm grouped cards. Deliberately narrow now that About owns the informational content.

**Appearance card**: label "Appearance"; segmented control or radio-card group with System / Light / Dark; show the current choice clearly; theme changes preview immediately.

No other cards in Phase 1 — no fake working controls for features that don't exist. (Language and version, if shown anywhere, live on the About page instead.)

## Images and icons

Prefer local event imagery in `public/` for a stable mock build, with a consistent crop and overlay treatment. If real images aren't available, use calm editorial placeholder visuals rather than random stock imagery. Icons should be consistent line icons — inline SVG or an existing project-supported approach; don't add a package solely for a handful of icons without approval.

## Interaction and accessibility

- All navigable cards must be keyboard accessible, with visible focus states
- Minimum comfortable touch target ~44px
- Never rely only on color to communicate selected state
- Respect reduced-motion preferences
- Use semantic headings and landmarks
- Light and dark contrast must remain accessible
- Avoid horizontal page scrolling
- External links should be clearly indicated

## Out of scope for Phase 1 UI

- Full comparison table as a primary mobile experience
- Global framing charts (unless added later with a clear reason)
- Saved events
- Notifications
- Account/profile UI
- Country preference management
- Admin screens
- Real-time breaking-news indicators
- Complex animations
