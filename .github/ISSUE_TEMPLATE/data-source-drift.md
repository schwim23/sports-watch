---
title: "[smoke] Data source drift"
labels: ["area:mlb", "type:bug", "priority:p1"]
---

The nightly live-data smoke test failed. Likely cause: MLB StatsAPI response shape changed and our parser/schema in `lib/sources/mlb.ts` needs updating.

**Triage steps**

1. Open the failing workflow run and read the Vitest output.
2. Diff the actual API response against `tests/fixtures/mlb-schedule.json`.
3. Update the Zod schema in `lib/sources/mlb.ts` to match.
4. Re-record the fixture.

**Action items**

- [ ] Identify which field changed
- [ ] Update Zod schema
- [ ] Update fixture
- [ ] Add regression test
