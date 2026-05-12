import deeplinks from "@/data/deeplinks.json";
import type { StreamingService } from "@prisma/client";

type Platform = "ios" | "android" | "web";

type DeepLinkEntry = {
  ios: string;
  android: string;
  web: string;
  displayName: string;
};

const REGISTRY = deeplinks as Record<string, DeepLinkEntry>;

export function detectPlatform(userAgent: string | null | undefined): Platform {
  if (!userAgent) return "web";
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

export type DeepLinkParams = {
  gamePk?: number | string;
};

export function resolveDeepLink(
  service: StreamingService | string,
  platform: Platform,
  params: DeepLinkParams = {},
): { url: string; displayName: string; platform: Platform } | null {
  const entry = REGISTRY[service];
  if (!entry) return null;
  const template = entry[platform];
  const url = template
    .replace("{gamePk}", String(params.gamePk ?? ""))
    .replace(/%7BgamePk%7D/gi, String(params.gamePk ?? ""));
  return { url, displayName: entry.displayName, platform };
}

export function resolveForUserAgent(
  service: StreamingService | string,
  userAgent: string | null | undefined,
  params: DeepLinkParams = {},
) {
  return resolveDeepLink(service, detectPlatform(userAgent), params);
}

export function displayName(service: StreamingService | string): string {
  return REGISTRY[service]?.displayName ?? service;
}
