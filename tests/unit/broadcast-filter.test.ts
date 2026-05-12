import { describe, it, expect } from "vitest";
import { filterBroadcasts } from "@/lib/broadcasts/filter";
import type { Broadcast } from "@prisma/client";

const game = {
  id: "g1",
  homeTeam: { abbreviation: "NYY" },
  awayTeam: { abbreviation: "BOS" },
  broadcasts: [
    { id: "b1", gameId: "g1", type: "LOCAL_RSN", callsign: "YES", market: "home", service: null, deepLinkOverride: null, createdAt: new Date() },
    { id: "b2", gameId: "g1", type: "LOCAL_RSN", callsign: "NESN", market: "away", service: null, deepLinkOverride: null, createdAt: new Date() },
    { id: "b3", gameId: "g1", type: "STREAMING_EXCLUSIVE", callsign: "MLB.TV", market: "national", service: "MLB_TV", deepLinkOverride: null, createdAt: new Date() },
  ] as Broadcast[],
};

describe("filterBroadcasts", () => {
  it("Yankees fan in NYC: surfaces YES, MLB.tv is blacked out", () => {
    const out = filterBroadcasts({
      game,
      user: { zip: "10001", subscriptions: ["YOUTUBE_TV", "MLB_TV"] },
    });
    const labels = out.map((o) => `${o.label}|${o.isBlackedOut}`);
    expect(labels[0]).toMatch(/YES Network/);
    expect(labels[0]).toMatch(/false$/);
    const mlbtv = out.find((o) => o.service === "MLB_TV");
    expect(mlbtv?.isBlackedOut).toBe(true);
  });

  it("Yankees fan in California: YES filtered out, MLB.tv usable", () => {
    const out = filterBroadcasts({
      game,
      user: { zip: "94103", subscriptions: ["MLB_TV"] },
    });
    expect(out.find((o) => o.label.includes("YES"))).toBeUndefined();
    const mlbtv = out.find((o) => o.service === "MLB_TV");
    expect(mlbtv?.isBlackedOut).toBe(false);
  });

  it("Red Sox fan in Boston: surfaces NESN", () => {
    const out = filterBroadcasts({
      game,
      user: { zip: "02101", subscriptions: ["YOUTUBE_TV"] },
    });
    expect(out.find((o) => o.label.includes("NESN"))).toBeTruthy();
  });

  it("user with no subs still sees options with 'needs subscription' note", () => {
    const out = filterBroadcasts({
      game,
      user: { zip: "30301", subscriptions: [] },
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((o) => o.notes?.includes("subscription") || o.notes?.includes("no carrying"))).toBe(true);
  });
});
