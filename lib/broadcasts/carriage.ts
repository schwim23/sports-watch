import carriage from "@/data/rsn-carriage.json";
import type { StreamingService } from "@prisma/client";

type CarriageEntry = {
  verified: boolean;
  carriers: StreamingService[];
  dtc: StreamingService | null;
  notes?: string;
};

type CarriageFile = {
  rsns: Record<string, CarriageEntry>;
  nationals?: Record<string, CarriageEntry>;
};

const FILE = carriage as CarriageFile;
const RSN_MAP = FILE.rsns;
const NATIONAL_MAP = FILE.nationals ?? {};

export type CarrierOption = {
  service: StreamingService;
  carrierKind: "vmvpd" | "dtc";
  carriageVerified: boolean;
  hasSubscription: boolean;
  isFallbackGuess: boolean;
};

const VMVPD_PRIORITY: StreamingService[] = [
  "YOUTUBE_TV",
  "HULU_LIVE",
  "FUBO",
  "DIRECTV_STREAM",
  "SLING",
];

/**
 * Return every streaming service that carries this RSN in the user's market,
 * ordered with user-subscribed carriers first, then DTC, then any remaining
 * mapped carriers (which the user could subscribe to).
 *
 * Why: a viewer may have several subscriptions or be deciding between options.
 * Auto-picking one destination hides alternatives.
 */
export function carriersForRsn(rsnId: string, subs: Set<StreamingService>): CarrierOption[] {
  const entry = RSN_MAP[rsnId];
  if (!entry) return fallbackGuessOptions(subs);
  return buildOptions(entry, subs);
}

/**
 * Return every streaming service that carries a national MLB broadcast
 * (FOX, TBS, MLB Network, ESPN, etc.). Keyed by network callsign.
 */
export function carriersForNational(
  networkKey: string,
  subs: Set<StreamingService>,
): CarrierOption[] {
  const entry = NATIONAL_MAP[networkKey];
  if (!entry) return fallbackGuessOptions(subs);
  return buildOptions(entry, subs);
}

/**
 * Lookup the carriage entry key from a national broadcast callsign.
 * Returns null for streaming-exclusive networks (ESPN+, Peacock, etc.) —
 * those are handled separately as STREAMING_EXCLUSIVE broadcasts.
 */
export function nationalKeyForCallsign(callsign: string | null): string | null {
  if (!callsign) return null;
  const cs = callsign.toUpperCase();
  if (cs.includes("ESPN+")) return null;
  if (cs.includes("PEACOCK")) return null;
  if (cs.includes("APPLE")) return null;
  if (cs.includes("PRIME") || cs.includes("AMAZON")) return null;
  if (cs.includes("ESPN2")) return "ESPN2";
  if (cs.includes("ESPNU")) return "ESPNU";
  if (cs === "ESPN" || cs.startsWith("ESPN ")) return "ESPN";
  if (cs.includes("MLB NET") || cs.includes("MLBN")) return "MLB_NETWORK";
  if (cs.includes("FS1")) return "FS1";
  if (cs.includes("FOX")) return "FOX";
  if (cs.includes("TBS")) return "TBS";
  return null;
}

function buildOptions(entry: CarriageEntry, subs: Set<StreamingService>): CarrierOption[] {
  const out: CarrierOption[] = [];
  const seen = new Set<StreamingService>();

  if (entry.verified) {
    for (const s of entry.carriers) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push({
        service: s,
        carrierKind: "vmvpd",
        carriageVerified: true,
        hasSubscription: subs.has(s),
        isFallbackGuess: false,
      });
    }
    if (entry.dtc && !seen.has(entry.dtc)) {
      seen.add(entry.dtc);
      out.push({
        service: entry.dtc,
        carrierKind: "dtc",
        carriageVerified: true,
        hasSubscription: subs.has(entry.dtc),
        isFallbackGuess: false,
      });
    }
  } else {
    for (const s of entry.carriers) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push({
        service: s,
        carrierKind: "vmvpd",
        carriageVerified: false,
        hasSubscription: subs.has(s),
        isFallbackGuess: false,
      });
    }
    if (entry.dtc && !seen.has(entry.dtc)) {
      seen.add(entry.dtc);
      out.push({
        service: entry.dtc,
        carrierKind: "dtc",
        carriageVerified: false,
        hasSubscription: subs.has(entry.dtc),
        isFallbackGuess: false,
      });
    }
  }

  return sortCarriers(out);
}

function fallbackGuessOptions(subs: Set<StreamingService>): CarrierOption[] {
  return VMVPD_PRIORITY.map((s) => ({
    service: s,
    carrierKind: "vmvpd" as const,
    carriageVerified: false,
    hasSubscription: subs.has(s),
    isFallbackGuess: true,
  }));
}

function sortCarriers(options: CarrierOption[]): CarrierOption[] {
  return [...options].sort((a, b) => {
    if (a.hasSubscription !== b.hasSubscription) return a.hasSubscription ? -1 : 1;
    if (a.carrierKind !== b.carrierKind) return a.carrierKind === "vmvpd" ? -1 : 1;
    return 0;
  });
}
