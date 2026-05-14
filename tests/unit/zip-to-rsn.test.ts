import { describe, it, expect } from "vitest";
import { rsnsForZip, teamsInHomeMarket, isTeamInUserMarket } from "@/lib/blackouts/zip-to-rsn";

describe("zip-to-rsn", () => {
  it("maps NYC ZIPs to YES + SNY", () => {
    const ids = rsnsForZip("10001")
      .map((r) => r.id)
      .sort();
    expect(ids).toContain("YES");
    expect(ids).toContain("SNY");
  });

  it("maps Boston ZIPs to NESN", () => {
    expect(rsnsForZip("02101").map((r) => r.id)).toContain("NESN");
  });

  it("Yankees fan in California is out-of-market", () => {
    expect(isTeamInUserMarket("NYY", "94103")).toBe(false);
  });

  it("Yankees fan in NYC is in-market", () => {
    expect(isTeamInUserMarket("NYY", "10001")).toBe(true);
  });

  it("returns empty for unknown ZIP", () => {
    expect(rsnsForZip("99999")).toHaveLength(0);
  });

  it("rejects malformed ZIPs", () => {
    expect(rsnsForZip("ab")).toHaveLength(0);
    expect(rsnsForZip("")).toHaveLength(0);
  });

  it("teamsInHomeMarket returns NYY+NYM for NYC", () => {
    const teams = teamsInHomeMarket("10001");
    expect(teams.has("NYY")).toBe(true);
    expect(teams.has("NYM")).toBe(true);
    expect(teams.has("BOS")).toBe(false);
  });
});
