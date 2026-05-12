import { describe, it, expect } from "vitest";
import { fetchSchedule } from "@/lib/sources/mlb";

const today = new Date().toISOString().slice(0, 10);

describe("MLB StatsAPI live smoke", () => {
  it("returns a schedule for today (or empty off-day)", async () => {
    const games = await fetchSchedule({ startDate: today, endDate: today });
    expect(Array.isArray(games)).toBe(true);
    if (games.length === 0) {
      console.warn("No MLB games today — likely off-day. Skipping shape assertions.");
      return;
    }
    const g = games[0]!;
    expect(typeof g.gamePk).toBe("number");
    expect(typeof g.gameDate).toBe("string");
    expect(g.status.detailedState.length).toBeGreaterThan(0);
    expect(g.teams.home.team.id).toBeGreaterThan(0);
    expect(g.teams.away.team.id).toBeGreaterThan(0);
  }, 30_000);
});
