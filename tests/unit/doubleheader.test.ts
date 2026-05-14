import { describe, it, expect } from "vitest";
import { filterBroadcasts } from "@/lib/broadcasts/filter";
import type { Broadcast, StreamingService } from "@prisma/client";

/**
 * A doubleheader is two games on the same date between the same teams,
 * with two distinct MLB gamePks (externalIds). They become two separate
 * Game rows; each independently filterable. This test confirms the watch
 * options for each are computed as if the other doesn't exist.
 */
describe("doubleheader handling", () => {
  const game1Broadcasts = [
    {
      id: "g1-b1",
      gameId: "g1",
      type: "LOCAL_RSN",
      callsign: "YES",
      market: "home",
      service: null,
      deepLinkOverride: null,
      createdAt: new Date(),
    },
  ] as Broadcast[];

  const game2Broadcasts = [
    {
      id: "g2-b1",
      gameId: "g2",
      type: "LOCAL_RSN",
      callsign: "YES",
      market: "home",
      service: null,
      deepLinkOverride: null,
      createdAt: new Date(),
    },
    {
      id: "g2-b2",
      gameId: "g2",
      type: "NATIONAL",
      callsign: "FOX",
      market: "national",
      service: null,
      deepLinkOverride: null,
      createdAt: new Date(),
    },
  ] as Broadcast[];

  it("produces independent watch groups per game in a doubleheader", () => {
    const user = { zip: "10001", subscriptions: ["YOUTUBE_TV"] as StreamingService[] };
    const teams = { homeTeam: { abbreviation: "NYY" }, awayTeam: { abbreviation: "BOS" } };

    const g1 = filterBroadcasts({
      game: { id: "g1", ...teams, broadcasts: game1Broadcasts },
      user,
    });
    const g2 = filterBroadcasts({
      game: { id: "g2", ...teams, broadcasts: game2Broadcasts },
      user,
    });

    expect(g1).toHaveLength(1);
    expect(g1[0]!.broadcastLabel).toContain("YES");

    expect(g2).toHaveLength(2);
    expect(g2.map((g) => g.broadcastLabel).sort()).toEqual(["FOX", "YES Network"].sort());
  });
});
