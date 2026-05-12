import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { readFile } from "node:fs/promises";

const FIXTURE = new URL("../fixtures/mlb-schedule.json", import.meta.url);

beforeAll(() => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes("/v1/schedule")) {
      const body = await readFile(FIXTURE, "utf8");
      return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("not found", { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("MLB schedule parsing", () => {
  it("parses fixture schedule shape", async () => {
    const { fetchSchedule } = await import("@/lib/sources/mlb");
    const games = await fetchSchedule({ startDate: "2026-05-11", endDate: "2026-05-11" });
    expect(games).toHaveLength(1);
    expect(games[0]?.gamePk).toBe(778483);
    expect(games[0]?.broadcasts?.length).toBe(3);
  });
});
