import { describe, it, expect } from "vitest";
import { filterBroadcasts } from "@/lib/broadcasts/filter";
import type { Broadcast } from "@prisma/client";

const game = {
  id: "g1",
  homeTeam: { abbreviation: "NYY" },
  awayTeam: { abbreviation: "BOS" },
  broadcasts: [
    {
      id: "b1",
      gameId: "g1",
      type: "LOCAL_RSN",
      callsign: "YES",
      market: "home",
      service: null,
      deepLinkOverride: null,
      createdAt: new Date(),
    },
    {
      id: "b2",
      gameId: "g1",
      type: "LOCAL_RSN",
      callsign: "NESN",
      market: "away",
      service: null,
      deepLinkOverride: null,
      createdAt: new Date(),
    },
    {
      id: "b3",
      gameId: "g1",
      type: "STREAMING_EXCLUSIVE",
      callsign: "MLB.TV",
      market: "national",
      service: "MLB_TV",
      deepLinkOverride: null,
      createdAt: new Date(),
    },
  ] as Broadcast[],
};

describe("filterBroadcasts (multi-carrier)", () => {
  it("Yankees fan in NYC: YES group surfaces all carriers; MLB.tv blacked out", () => {
    const groups = filterBroadcasts({
      game,
      user: { zip: "10001", subscriptions: ["YOUTUBE_TV", "MLB_TV"] },
    });
    const yes = groups.find((g) => g.broadcastLabel.includes("YES"));
    expect(yes).toBeTruthy();
    expect(yes!.isLocal).toBe(true);
    // YES isn't on YouTube TV; user has YT TV. Fubo / DirecTV / Gotham should still show.
    const services = yes!.options.map((o) => o.service);
    expect(services).toContain("FUBO");
    expect(services).toContain("DIRECTV_STREAM");
    expect(services).toContain("GOTHAM_SPORTS");
    expect(services).not.toContain("YOUTUBE_TV");

    const mlbtv = groups.find((g) => g.broadcastType === "STREAMING_EXCLUSIVE");
    expect(mlbtv?.isBlackedOut).toBe(true);
  });

  it("Yankees fan in California: YES filtered out (not in market), MLB.tv usable", () => {
    const groups = filterBroadcasts({
      game,
      user: { zip: "94103", subscriptions: ["MLB_TV"] },
    });
    expect(groups.find((g) => g.broadcastLabel.includes("YES"))).toBeUndefined();
    const mlbtv = groups.find((g) => g.broadcastType === "STREAMING_EXCLUSIVE");
    expect(mlbtv).toBeTruthy();
    expect(mlbtv!.isBlackedOut).toBe(false);
    expect(mlbtv!.options[0]?.hasSubscription).toBe(true);
  });

  it("Red Sox fan in Boston: NESN group lists multiple carriers", () => {
    const groups = filterBroadcasts({
      game,
      user: { zip: "02101", subscriptions: ["YOUTUBE_TV"] },
    });
    const nesn = groups.find((g) => g.broadcastLabel.includes("NESN"));
    expect(nesn).toBeTruthy();
    expect(nesn!.options.length).toBeGreaterThan(1);
    expect(nesn!.options[0]!.hasSubscription).toBe(true);
    expect(nesn!.options[0]!.service).toBe("YOUTUBE_TV");
  });

  it("user with no subs: groups still surface carrier options with subscription notes", () => {
    const groups = filterBroadcasts({
      game,
      user: { zip: "30301", subscriptions: [] },
    });
    expect(groups.length).toBeGreaterThan(0);
    const anyNeedsSub = groups.some((g) =>
      g.options.some((o) => /needs|subscription|carriage unknown/.test(o.notes ?? "")),
    );
    expect(anyNeedsSub).toBe(true);
  });

  it("carriers are sorted with user-subscribed first", () => {
    const groups = filterBroadcasts({
      game,
      user: { zip: "10001", subscriptions: ["FUBO"] },
    });
    const yes = groups.find((g) => g.broadcastLabel.includes("YES"));
    expect(yes!.options[0]!.service).toBe("FUBO");
    expect(yes!.options[0]!.hasSubscription).toBe(true);
  });

  it("Apple TV+ exclusive: stale RSN entries are suppressed (Friday Night Baseball)", () => {
    // Scenario: Yankees @ Mets on Apple TV+ FNB. MLB locks the game to Apple
    // and removes RSN broadcasts, but our DB still has stale YES + SNY rows
    // from an earlier fetch. The filter must drop them.
    const fnbGame = {
      id: "g2",
      homeTeam: { abbreviation: "NYM" },
      awayTeam: { abbreviation: "NYY" },
      broadcasts: [
        {
          id: "stale-yes",
          gameId: "g2",
          type: "LOCAL_RSN",
          callsign: "YES",
          market: "away",
          service: null,
          deepLinkOverride: null,
          createdAt: new Date(),
        },
        {
          id: "stale-sny",
          gameId: "g2",
          type: "LOCAL_RSN",
          callsign: "SNY",
          market: "home",
          service: null,
          deepLinkOverride: null,
          createdAt: new Date(),
        },
        {
          id: "apple",
          gameId: "g2",
          type: "STREAMING_EXCLUSIVE",
          callsign: "Apple TV",
          market: "national",
          service: "APPLE_TV",
          deepLinkOverride: null,
          createdAt: new Date(),
        },
      ] as Broadcast[],
    };

    const groups = filterBroadcasts({
      game: fnbGame,
      user: { zip: "10001", subscriptions: ["YOUTUBE_TV"] },
    });

    expect(groups.find((g) => g.broadcastLabel.includes("YES"))).toBeUndefined();
    expect(groups.find((g) => g.broadcastLabel.includes("SNY"))).toBeUndefined();
    const apple = groups.find((g) => g.broadcastType === "STREAMING_EXCLUSIVE");
    expect(apple).toBeTruthy();
    expect(apple!.options[0]!.service).toBe("APPLE_TV");
  });

  it("Peacock exclusive: stale RSN entries are suppressed (Sunday Leadoff)", () => {
    const peacockGame = {
      ...game,
      broadcasts: [
        {
          id: "stale-yes",
          gameId: "g1",
          type: "LOCAL_RSN",
          callsign: "YES",
          market: "home",
          service: null,
          deepLinkOverride: null,
          createdAt: new Date(),
        },
        {
          id: "peacock",
          gameId: "g1",
          type: "STREAMING_EXCLUSIVE",
          callsign: "Peacock",
          market: "national",
          service: "PEACOCK",
          deepLinkOverride: null,
          createdAt: new Date(),
        },
      ] as Broadcast[],
    };
    const groups = filterBroadcasts({
      game: peacockGame,
      user: { zip: "10001", subscriptions: [] },
    });
    expect(groups.find((g) => g.broadcastLabel.includes("YES"))).toBeUndefined();
    expect(groups.find((g) => g.broadcastType === "STREAMING_EXCLUSIVE")).toBeTruthy();
  });

  it("Prime/ESPN+ presence does NOT suppress RSN (mixed simulcast deals)", () => {
    // Prime Yankees package historically simulcast on YES; we trust MLB's
    // broadcasts list rather than blanket-suppressing.
    const primeGame = {
      ...game,
      broadcasts: [
        {
          id: "yes",
          gameId: "g1",
          type: "LOCAL_RSN",
          callsign: "YES",
          market: "home",
          service: null,
          deepLinkOverride: null,
          createdAt: new Date(),
        },
        {
          id: "prime",
          gameId: "g1",
          type: "STREAMING_EXCLUSIVE",
          callsign: "Prime Video",
          market: "national",
          service: "PRIME",
          deepLinkOverride: null,
          createdAt: new Date(),
        },
      ] as Broadcast[],
    };
    const groups = filterBroadcasts({
      game: primeGame,
      user: { zip: "10001", subscriptions: [] },
    });
    expect(groups.find((g) => g.broadcastLabel.includes("YES"))).toBeTruthy();
  });

  it("national broadcast (FOX) produces carrier options", () => {
    const fxGame = {
      ...game,
      broadcasts: [
        {
          id: "fox1",
          gameId: "g1",
          type: "NATIONAL",
          callsign: "FOX",
          market: "national",
          service: null,
          deepLinkOverride: null,
          createdAt: new Date(),
        },
      ] as Broadcast[],
    };
    const groups = filterBroadcasts({
      game: fxGame,
      user: { zip: "30301", subscriptions: ["YOUTUBE_TV"] },
    });
    const fox = groups.find((g) => g.broadcastLabel === "FOX");
    expect(fox).toBeTruthy();
    expect(fox!.options.length).toBeGreaterThan(0);
    expect(fox!.options[0]!.service).toBe("YOUTUBE_TV");
    expect(fox!.options[0]!.hasSubscription).toBe(true);
  });
});
