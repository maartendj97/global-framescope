# FrameScope Observability Dashboard

Standalone Next.js app — deployed as its own Vercel project so it keeps working even if the main [global-framescope](../) app's build is broken. One mobile-friendly page of stat tiles (visits, unique visitors, GNews/NewsData/Anthropic daily usage against their caps), gated by a single shared password.

Lives in this repo as a subfolder rather than its own git repo — when creating the Vercel project, set **Root Directory** to `observability-dashboard`. The two apps deploy and scale independently either way.

## Setup

```bash
cd observability-dashboard
npm install
cp .env.example .env.local
# fill in METRICS_API_URL, METRICS_API_TOKEN (must match the main app's
# METRICS_API_TOKEN), and DASHBOARD_PASSWORD
npm run dev
```

## How it works

- `src/lib/session.ts` — single-password login; the session cookie is a hash of `DASHBOARD_PASSWORD` itself, so there's no server-side session store.
- `src/lib/metrics.ts` — server-side fetch of the main app's `GET /api/admin/metrics`, `cache: "no-store"` (always fresh). The bearer token stays server-side; the browser never sees it.
- `src/app/page.tsx` — Server Component: shows the login form when unauthenticated, otherwise the stat tiles.

## Deploying

1. Push this repo to GitHub (or push just this subfolder if split into its own repo later).
2. Import the repo as a new Vercel project, Root Directory = `observability-dashboard`.
3. Set `METRICS_API_URL`, `METRICS_API_TOKEN`, `DASHBOARD_PASSWORD` in that project's Vercel env vars (not the main app's) — enter the values yourself in the Vercel dashboard.
