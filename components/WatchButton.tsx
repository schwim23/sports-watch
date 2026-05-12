"use client";

import type { StreamingService } from "@prisma/client";
import { resolveForUserAgent, displayName } from "@/lib/deeplinks/resolver";

export default function WatchButton({ service, gamePk }: { service: StreamingService; gamePk: string }) {
  const onClick = () => {
    const resolved = resolveForUserAgent(service, navigator.userAgent, { gamePk });
    if (!resolved) return;
    window.location.href = resolved.url;
  };
  return <button onClick={onClick} aria-label={`Watch on ${displayName(service)}`}>Watch</button>;
}
