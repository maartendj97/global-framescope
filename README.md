# Global FrameScope

**One event, viewed through multiple national perspectives.**

Global FrameScope is a mobile-first application for comparing how the same major international event is framed by media across different countries — neutral event context, country-specific framing analysis, terminology/tone differences, and links to original sources. It's an analysis and comparison tool, not a news reader.

## Current phase

**Phase 1 (UI) is complete, and part of Phase 3 (real data) is live.** The app fetches real world events from GNews (with Currents as backup and direct state-media RSS feeds for Russia/China/Iran), cached in shared Upstash Redis, served through two API routes. The per-country *framing analysis* — the product's core feature — is still mock data for three illustrative events; AI-generated framing for live events is the next big milestone. No database, AI, or authentication yet. See [docs/ROADMAP.md](docs/ROADMAP.md) for exact status.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, `src/app/`)
- React 19 + TypeScript (strict)
- Tailwind CSS v4
- Upstash Redis (shared cache, via the Vercel integration)
- Vitest (unit tests: `npm test`)

> This project runs on a Next.js version with breaking changes relative to older docs/training data. See [AGENTS.md](AGENTS.md) before writing code, and check `node_modules/next/dist/docs/` for the current API.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without API keys the app falls back to mock events; copy `.env.example` to `.env.local` and add keys for live data.

> Note: every npm script invokes its binary via `node` directly (e.g. `node node_modules/next/dist/bin/next dev`) instead of the usual bare command. The local development path contains a colon (`Documents:Global-FrameScope`), which is the PATH separator — so npm cannot put `node_modules/.bin` on PATH and bare commands like `next` or `eslint` fail with "command not found". Keep new scripts in the same style.

## Documentation

Documentation is the source of truth for this project — prefer it over assumptions or prior chat history:

- [docs/MVP_SPEC.md](docs/MVP_SPEC.md) — product definition, phases, pages, country model
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, layer separation, data-access layer
- [docs/UI_FLOW.md](docs/UI_FLOW.md) — navigation, routes, and screen flow
- [docs/UI_DESIGN.md](docs/UI_DESIGN.md) — visual spec: typography, color tokens, light/dark themes, layout
- [docs/ROADMAP.md](docs/ROADMAP.md) — phase-by-phase progress
