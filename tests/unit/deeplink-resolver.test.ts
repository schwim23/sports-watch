import { describe, it, expect } from "vitest";
import { resolveDeepLink, resolveForUserAgent, detectPlatform } from "@/lib/deeplinks/resolver";

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

describe("detectPlatform", () => {
  it("detects iOS", () => expect(detectPlatform(IOS_UA)).toBe("ios"));
  it("detects Android", () => expect(detectPlatform(ANDROID_UA)).toBe("android"));
  it("falls back to web", () => expect(detectPlatform(DESKTOP_UA)).toBe("web"));
  it("handles missing UA", () => expect(detectPlatform(null)).toBe("web"));
});

describe("resolveDeepLink", () => {
  it("substitutes gamePk for MLB.tv web", () => {
    const r = resolveDeepLink("MLB_TV", "web", { gamePk: 778483 });
    expect(r?.url).toBe("https://www.mlb.com/tv/g778483");
  });

  it("uses iOS scheme for MLB.tv on iPhone", () => {
    const r = resolveDeepLink("MLB_TV", "ios", { gamePk: 778483 });
    expect(r?.url).toMatch(/^mlbatbat:/);
  });

  it("returns null for unknown service", () => {
    expect(resolveDeepLink("MADE_UP" as never, "web")).toBeNull();
  });

  it("resolveForUserAgent picks platform from UA", () => {
    const r = resolveForUserAgent("YOUTUBE_TV", ANDROID_UA);
    expect(r?.url).toMatch(/^intent:/);
  });
});
