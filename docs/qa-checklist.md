# QA checklist

Manual flows to walk through before each release. Each release PR should check off this list.

## Golden path — first-time user

- [ ] Visit `/` while signed out → redirected to `/login`
- [ ] Sign in with Google → land on `/home`
- [ ] Banner directs to `/onboarding` since no ZIP/teams yet
- [ ] Enter ZIP `10001`, select YouTube TV + MLB.tv, follow Yankees → save
- [ ] `/home` shows next-7-days Yankees schedule
- [ ] Game card shows "YES Network" as best option (Yankees fan in NY market)
- [ ] Click "Watch" → opens YouTube TV URL on desktop, deep-link prompt on mobile

## Out-of-market user

- [ ] Set ZIP `94103` (San Francisco)
- [ ] Yankees game now shows MLB.tv as primary (out-of-market)
- [ ] YES Network not surfaced

## Blackout edge case

- [ ] Set ZIP `10001`, subscribe to MLB.tv only
- [ ] Yankees home game: MLB.tv option shows "blacked out" label
- [ ] Yankees away game in non-NY market: MLB.tv usable

## Live scoreboard

- [ ] Visit a game page while game is in progress
- [ ] Score / inning updates within 30s without page reload
- [ ] When game ends, status flips to FINAL and polling stops

## Push notifications

- [ ] Settings page → enable notifications
- [ ] Browser permission granted, button flips to "Disable"
- [ ] Trigger `/api/notifications/dispatch` via cron secret
- [ ] System notification appears for an upcoming followed game
- [ ] Second trigger does NOT re-notify (idempotency)

## Mobile

- [ ] iPhone Safari: login + onboarding render correctly
- [ ] Android Chrome: deep-link button opens correct intent
- [ ] PWA install prompt visible

## Edge cases

- [ ] Doubleheader: both games appear as distinct cards
- [ ] Postponed game: status renders as `POSTPONED`, no "Watch" button
- [ ] Suspended game: status renders, scoreboard shows last state
- [ ] Off-day: home view shows "no games" message gracefully
