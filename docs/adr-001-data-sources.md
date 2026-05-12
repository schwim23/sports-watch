# ADR 001 — Data sources

## Status

Accepted, 2026-05-11.

## Context

We need MLB schedules, live game state, and broadcast info. Three options were considered:

1. **Pure scraping** of MLB.com / RSN sites
2. **Paid sports data** (Sportradar, MySportsFeeds)
3. **Free public APIs** (MLB StatsAPI primarily)

## Decision

Start with **MLB StatsAPI** (`statsapi.mlb.com`) as the sole data source for MVP.

- It's the same backend powering MLB.com and the official MLB app.
- Schedules include a `broadcasts` array per game with TV/radio outlets and home/away/national designation.
- Live feed (`/v1.1/game/{gamePk}/feed/live`) is updated ~every pitch.
- Free, no API key required, no published rate limit (we will self-rate-limit conservatively).
- A nightly smoke test (`tests/smoke/`) catches drift early and auto-files an issue.

If/when StatsAPI shape changes break us, we fall back to ESPN's undocumented JSON endpoints; that adapter goes in `lib/sources/espn.ts` and the rest of the code only knows about our internal `Game` model.

## Consequences

- Zero data-source cost in MVP.
- Risk: API is undocumented; MLB can change it without notice. Mitigated by Zod parsing + smoke tests.
- We will not have schedules for non-MLB leagues until we add per-league sources (`lib/sources/nhl.ts`, etc.) in M7+.
