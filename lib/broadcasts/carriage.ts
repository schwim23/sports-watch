import carriage from "@/data/rsn-carriage.json";
import type { StreamingService } from "@prisma/client";

type CarriageEntry = {
  verified: boolean;
  carriers: StreamingService[];
  dtc: StreamingService | null;
  notes?: string;
};

const CARRIAGE = (carriage as { rsns: Record<string, CarriageEntry> }).rsns;

export type RsnDestination = {
  service: StreamingService;
  source: "user-vmvpd" | "dtc-fallback" | "vmvpd-unverified";
  carriageVerified: boolean;
};

/**
 * Resolve where a user should watch a game on a given RSN.
 *
 * Why: a user's VMVPD subscriptions don't always carry every RSN
 * (e.g., YES Network isn't on YouTube TV). Falling back to "any VMVPD
 * the user has" sends viewers to apps that won't show the game.
 */
export function resolveRsnDestination(
  rsnId: string,
  subs: Set<StreamingService>,
): RsnDestination | null {
  const entry = CARRIAGE[rsnId];

  if (entry?.verified) {
    for (const s of entry.carriers) {
      if (subs.has(s)) return { service: s, source: "user-vmvpd", carriageVerified: true };
    }
    if (entry.dtc) {
      return { service: entry.dtc, source: "dtc-fallback", carriageVerified: true };
    }
    return null;
  }

  for (const s of VMVPD_PRIORITY) {
    if (subs.has(s)) return { service: s, source: "vmvpd-unverified", carriageVerified: false };
  }
  return null;
}

const VMVPD_PRIORITY: StreamingService[] = [
  "YOUTUBE_TV",
  "HULU_LIVE",
  "FUBO",
  "DIRECTV_STREAM",
  "SLING",
];
