"use client";

import type { StreamingService } from "@prisma/client";
import { resolveForUserAgent, displayName } from "@/lib/deeplinks/resolver";

type Props = {
  service: StreamingService;
  gamePk: string;
  small?: boolean;
};

export default function WatchButton({ service, gamePk, small }: Props) {
  const name = displayName(service);
  const onClick = () => {
    const resolved = resolveForUserAgent(service, navigator.userAgent, { gamePk });
    if (!resolved) return;
    window.location.href = resolved.url;
  };
  return (
    <button
      onClick={onClick}
      aria-label={`Watch on ${name}`}
      title={`Opens ${name} — falls back to the website if the app isn't installed`}
      className={small ? "secondary" : undefined}
      style={small ? { padding: "0.35rem 0.7rem", fontSize: "0.9rem" } : undefined}
    >
      Watch
    </button>
  );
}
