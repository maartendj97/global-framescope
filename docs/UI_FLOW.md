# UI Flow

Navigation and screen-flow source of truth. Content requirements per screen live in [MVP_SPEC.md](MVP_SPEC.md); visual states (colors, chip styling, etc.) live in [UI_DESIGN.md](UI_DESIGN.md).

## Routes

| Route | Screen |
|---|---|
| `/` | Home |
| `/events` | Events |
| `/events/[id]` | Event Detail |
| `/about` | About |
| `/settings` | Settings |

`/events/[id]` has no nav-bar entry of its own — it's reached only via an event card (see below). There is no `/sources` route — per-event sources live inside each Event Detail's Sources tab; About covers sourcing at a product level (see [MVP_SPEC.md](MVP_SPEC.md#about-page)).

## Bottom navigation

Exactly 4 items, always visible on Home / Events / About / Settings:

```
┌─────────────────────────────────────┐
│                                      │
│         (screen content)            │
│                                      │
├─────────────────────────────────────┤
│  ⬤ Home    Events     About    Set. │   ← floating rounded pill nav
└─────────────────────────────────────┘
```

- The active tab gets a rounded **pill-style** highlight (background shape behind the icon/label, not just a color change).
- The nav bar itself is rounded and reads as a floating mobile-app nav bar (elevated, not a flush edge-to-edge bar).
- **Event Detail is intentionally not a 5th nav item.** It's reached only by tapping into an event.

## Screen flow

```
Home ──(tap event card)──┐
                          ├──> Event Detail
Events ─(tap event card)─┘        │
                                   ├─ Overview tab
                                   ├─ Countries tab ──(tap a country row)──> Country Perspective (full-screen)
                                   ├─ Differences tab (comparison table)
                                   └─ Sources tab (this event's sources)

About (nav) ──> About page (product info, methodology, sourcing note — not a source browser)
Settings (nav) ──> Settings (Appearance only in Phase 1)
```

- **Home → Event Detail**: tapping a featured/recent event card on Home opens that event's Event Detail page.
- **Events → Event Detail**: tapping any event card in the full Events list opens the same Event Detail page.
- Both entry points land on the same Event Detail screen — there is one Event Detail implementation, not a Home-variant and an Events-variant.

## Event Detail interaction pattern

Event Detail is organized into 4 tabs, not one long scrolling page: **Overview, Countries, Differences, Sources**.

1. **Overview tab** (default on open): event image, category/region/type tags, title, published date, neutral summary, broader context, and a "Countries included" grid showing all eight countries (flag + name) as a preview — not yet interactive framing detail.
2. **Countries tab**: all eight countries listed as rows (flag, name, a one-line main-frame label, and a tone badge — e.g. Concerned / Cautious / Critical / Neutral / Balanced / Supportive). Tapping a row opens that country's **Country Perspective** view.
3. **Country Perspective** (opened from a Countries-tab row, with its own back navigation): tone badge, main frame, narrative summary, key focus points, an Emphasized/Downplayed two-column comparison, and the sources cited for that specific country's framing.
4. **Differences tab**: a comparison table — one row per country, columns for Main frame and Tone — giving an at-a-glance cross-country view. (This supersedes an earlier stacked-card-only design; see [UI_DESIGN.md](UI_DESIGN.md#key-differences-ui).)
5. **Sources tab**: the full list of sources cited anywhere in this event's analysis.

No country's framing is shown until the user taps into it from the Countries tab — first load never jumps straight to a country's detail.

## Notes

- Mobile is the primary target; desktop layouts are secondary but should not break.
- No page in the MVP requires the user to read a full news article inside the app — Event Detail is analysis/comparison, not an article reader.
