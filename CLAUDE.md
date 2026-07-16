@AGENTS.md

# Global FrameScope

Mobile-first app for comparing how the same major international event is framed by media across different countries. Tagline: "One event, viewed through multiple national perspectives." Analysis/comparison tool, not a news reader.

**Phase 1 (UI) is complete; part of Phase 3 (real data) is live**: real events come from GNews (Currents backup, state-media RSS for RU/CN/IR), cached in shared Upstash Redis (`src/lib/cache.ts` — Next's own fetch cache does not work on this Vercel setup), served via `src/app/api/*` routes. Per-country framing analysis is still mock data (3 illustrative events). First AI feature is live: per-country headline summaries via `src/app/api/country-summary` (Anthropic Haiku, 24h Redis cache, single-flight lock, daily spend cap in `src/lib/external/anthropicUsage.ts`; needs `ANTHROPIC_API_KEY`, hidden without it). No DB or auth yet. Tests run with Vitest (`npm test`).

`docs/` is the source of truth for product and architecture decisions — read it before assuming anything, and don't rely on prior chat history:

- [docs/MVP_SPEC.md](docs/MVP_SPEC.md) — product definition, phases, pages, country model
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, layer separation, data-access layer
- [docs/UI_FLOW.md](docs/UI_FLOW.md) — navigation, routes, and screen flow
- [docs/UI_DESIGN.md](docs/UI_DESIGN.md) — visual spec: typography, color tokens, light/dark themes, layout
- [docs/ROADMAP.md](docs/ROADMAP.md) — phase-by-phase progress
- [README.md](README.md) — human-facing overview and quick start

Read the relevant doc(s) above before any UI work — don't guess at nav items, routes, colors, or fonts from memory.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
