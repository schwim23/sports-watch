# sports-watch

Track your favorite teams' schedules and know exactly where to watch every game — local RSN, national TV, or streaming — with one-tap deep links into the right app.

MVP league: **MLB**. Other leagues (NHL, NBA, NFL) come post-launch.

## Status

Scaffolded by milestone M0. See [the plan](../.claude/plans/i-am-interested-in-indexed-orbit.md) for the full roadmap.

| Milestone | Status |
|---|---|
| M0 — scaffolding | in progress |
| M1 — MLB ingestion | pending |
| M2 — onboarding + home view | pending |
| M3 — deep-link registry + Watch button | pending |
| M4 — live scoreboard | pending |
| M5 — push notifications | pending |
| M6 — polish | pending |

## Prerequisites

- Node.js **20.x or newer**
- pnpm **9.x or newer** (`npm i -g pnpm`)
- A Neon Postgres database (free tier works)
- Google OAuth client credentials ([console](https://console.cloud.google.com/apis/credentials))

## Quick start

```bash
pnpm install
cp .env.example .env
# fill in DATABASE_URL, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET
pnpm vapid:generate >> .env   # appends VAPID keys
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000.

## Testing

```bash
pnpm typecheck          # tsc --noEmit
pnpm lint               # ESLint
pnpm test:unit          # Vitest unit tests
pnpm test:integration   # Vitest integration (needs DATABASE_URL)
pnpm test:e2e           # Playwright (starts dev server)
pnpm test:smoke         # Hits live MLB StatsAPI — catches schema drift
```

## Layout

```
app/                  Next.js App Router (RSC + client) + API routes
lib/                  Domain logic (no React)
  sources/mlb.ts      MLB StatsAPI client
  deeplinks/          Deep-link resolver + types
  blackouts/          ZIP → RSN/market mapping
  broadcasts/         Filter game broadcasts by user prefs
  push/               Web Push send helpers
data/                 Static JSON (deeplinks, blackouts, team seed)
prisma/               Schema + migrations
tests/                Unit / integration / e2e / smoke
.github/              CI workflows + issue templates
docs/                 QA checklist, ADRs
scripts/              Seed, VAPID keygen, dev utilities
```

## Deployment

- **Hosting:** Vercel (cron jobs scheduled in `vercel.json`)
- **DB:** Neon (use the `main` branch in prod; PR previews use Neon DB branches)
- **Domain:** TBD before launch

## Contributing

See `.github/ISSUE_TEMPLATE/` for issue templates. PRs must pass:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm test:e2e`
