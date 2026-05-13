# Backlog seed

Pre-populate the GitHub Issues with these once the repo is pushed. Each maps to an `M*` milestone from the plan.

## M1 — MLB ingestion

- [ ] Wire `CRON_SECRET` enforcement on `/api/games/refresh` end-to-end
- [ ] Backfill `Team.logoUrl` from MLB StatsAPI
- [ ] Handle doubleheaders (two games with same date, same teams)
- [ ] Handle game suspensions (status mapping + resume detection)
- [ ] Add observability: log row counts per cron run to a `RefreshAudit` table

## M2 — Onboarding & home view

- [ ] Onboarding ZIP validation (only allow real US ZIPs)
- [ ] Show "in your market" / "out of market" badge on team picker
- [ ] Empty state when user has no followed teams
- [ ] Group home view by day (Today, Tomorrow, …)
- [ ] Persist subscription edits without resetting follows

## M3 — Deep-link registry & Watch button

- [ ] Audit each deep-link URL on iOS Safari + Android Chrome
- [ ] Add `<meta name="apple-itunes-app">` smart banner for MLB.tv
- [ ] Surface a 1-line "what this does" tooltip on Watch button
- [ ] Handle "no carrying VMVPD" case with a CTA to add a subscription
- [ ] **Show ALL streaming options for live-TV broadcasts, not just one auto-picked destination.** When a game is on a live-TV channel (RSN or national network), surface every streaming service that carries that channel in the user's market — VMVPDs (YouTube TV, Hulu + Live, Fubo, DirecTV Stream, Sling) and any DTC option (Gotham Sports, NESN 360, etc.). Today `filterBroadcasts` collapses each broadcast to a single resolved `service`; we need to return a list of carrier options per broadcast. Scope:
  - **Carriage research:** populate `data/rsn-carriage.json` `carriers` arrays for all 29 MLB RSNs (currently only YES + SNY are `verified: true`); the other 27 fall back to "any user VMVPD" with an "unverified" disclaimer.
  - **National networks:** `nationalCarrier()` in `lib/broadcasts/filter.ts` has the same single-pick bug — add an analogous carriage map for FOX, TBS, MLB Network, ESPN/2/U so users see every VMVPD that carries them in their market.
  - **Data shape:** change `WatchOption.service` from a single value to `services: StreamingService[]` (or return one `WatchOption` per carrier).
  - **UI:** redesign `GameCard` + `app/(app)/game/[id]/page.tsx` to render a list of Watch buttons with user's subscribed options surfaced first, then DTC, then "needs subscription" CTAs.

## M4 — Live scoreboard

- [ ] Pitch-by-pitch state (current batter / pitcher)
- [ ] Auto-stop polling when game ends
- [ ] Visual base diamond
- [ ] Test offline / flaky network handling

## M5 — Push notifications

- [ ] Per-team mute toggle
- [ ] Quiet hours (no pushes 11pm–8am local)
- [ ] Test push delivery on iOS PWA (16.4+ only)
- [ ] Add unsubscribe link in push payload

## M6 — Polish

- [ ] Lighthouse perf budget 90+
- [ ] Accessibility audit (keyboard nav, screen reader)
- [ ] Postponement banner + reschedule notification
- [ ] PWA install prompt UX
- [ ] Privacy policy + ToS pages
- [ ] **Restyle UI to match MLB.com's visual language** — current `app/globals.css` is a generic dark theme (navy bg `#0b1020`, blue accent `#4f8cff`). Replace with MLB-aligned palette (primary navy ~`#002D72`, red ~`#BF0D3E`, light surfaces) and typography (MLB-style sans — Helvetica Neue / Inter / similar). Audit every component (`GameCard`, `WatchButton`, `OnboardingForm`, `Scoreboard`, `PushToggle`, login + onboarding pages) for consistent spacing, radii, and hover states. Decide whether to stay with hand-rolled CSS or pull in a small token system (e.g., CSS custom properties grouped by `--mlb-*`).

## Tech debt / chores

- [ ] Add Sentry or similar error reporting
- [ ] Add `RefreshAudit` model for cron observability
- [ ] CSP headers
- [ ] Rate-limit `/api/me` PATCH and `/api/follows`
