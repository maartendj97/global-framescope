# Global FrameScope

**One event, viewed through multiple national perspectives.**

Global FrameScope is a mobile-first application for comparing how the same major international event is framed by media across different countries — neutral event context, country-specific framing analysis, terminology/tone differences, and links to original sources. It's an analysis and comparison tool, not a news reader.

## Current phase

**Phase 1 — UI + mock data.** The app is being built with a complete UI and user flow backed by mock data only; no real database, external APIs, AI, or authentication yet. See [docs/ROADMAP.md](docs/ROADMAP.md) for phase status.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, `src/app/`)
- React 19 + TypeScript (strict)
- Tailwind CSS v4

> This project runs on a Next.js version with breaking changes relative to older docs/training data. See [AGENTS.md](AGENTS.md) before writing code, and check `node_modules/next/dist/docs/` for the current API.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Documentation

Documentation is the source of truth for this project — prefer it over assumptions or prior chat history:

- [docs/MVP_SPEC.md](docs/MVP_SPEC.md) — product definition, phases, pages, country model
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, layer separation, data-access layer
- [docs/UI_FLOW.md](docs/UI_FLOW.md) — navigation, routes, and screen flow
- [docs/UI_DESIGN.md](docs/UI_DESIGN.md) — visual spec: typography, color tokens, light/dark themes, layout
- [docs/ROADMAP.md](docs/ROADMAP.md) — phase-by-phase progress
