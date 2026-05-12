import type { Broadcast, StreamingService, Team } from "@prisma/client";
import { isTeamInUserMarket, rsnByTeam } from "@/lib/blackouts/zip-to-rsn";

export type WatchOption = {
  broadcastId: string;
  label: string;
  service: StreamingService | null;
  isLocal: boolean;
  isBlackedOut: boolean;
  priority: number; // lower = better fit
  notes?: string;
};

type FilterArgs = {
  game: {
    id: string;
    homeTeam: Pick<Team, "abbreviation">;
    awayTeam: Pick<Team, "abbreviation">;
    broadcasts: Broadcast[];
  };
  user: {
    zip: string | null;
    subscriptions: StreamingService[];
  };
};

/**
 * Filter game broadcasts down to the watch options that are actually
 * usable for this user, sorted best-fit first.
 *
 * Why: RSN feeds are only viewable in-market; out-of-market viewers fall
 * back to MLB.tv (blacked out for locals). Surface only what works.
 */
export function filterBroadcasts({ game, user }: FilterArgs): WatchOption[] {
  const subs = new Set(user.subscriptions);
  const inHomeMarket = isTeamInUserMarket(game.homeTeam.abbreviation, user.zip);
  const inAwayMarket = isTeamInUserMarket(game.awayTeam.abbreviation, user.zip);
  const userIsLocal = inHomeMarket || inAwayMarket;
  const options: WatchOption[] = [];

  for (const b of game.broadcasts) {
    if (b.type === "RADIO") continue;

    if (b.type === "LOCAL_RSN") {
      const teamAbbr =
        b.market === "home" ? game.homeTeam.abbreviation : b.market === "away" ? game.awayTeam.abbreviation : null;
      const matchesUserMarket = teamAbbr ? isTeamInUserMarket(teamAbbr, user.zip) : false;
      if (matchesUserMarket) {
        const rsn = teamAbbr ? rsnByTeam(teamAbbr) : null;
        options.push({
          broadcastId: b.id,
          label: rsn?.name ?? b.callsign ?? "Local RSN",
          service: pickVmvpdForRsn(subs),
          isLocal: true,
          isBlackedOut: false,
          priority: 0,
          notes: pickVmvpdForRsn(subs) ? `via ${displayService(pickVmvpdForRsn(subs)!)}` : "no carrying subscription",
        });
      }
      continue;
    }

    if (b.type === "NATIONAL") {
      const carrier = nationalCarrier(b.callsign, subs);
      options.push({
        broadcastId: b.id,
        label: b.callsign ?? "National TV",
        service: carrier,
        isLocal: false,
        isBlackedOut: false,
        priority: 1,
        notes: carrier ? `via ${displayService(carrier)}` : "requires a VMVPD subscription",
      });
      continue;
    }

    if (b.type === "STREAMING_EXCLUSIVE" && b.service) {
      const hasSub = subs.has(b.service);
      options.push({
        broadcastId: b.id,
        label: displayService(b.service),
        service: b.service,
        isLocal: false,
        isBlackedOut: b.service === "MLB_TV" && userIsLocal,
        priority: hasSub ? 0.5 : 3,
        notes:
          b.service === "MLB_TV" && userIsLocal
            ? "blacked out in your market — use local RSN instead"
            : hasSub
              ? "you have this"
              : "needs subscription",
      });
    }
  }

  return options.sort((a, b) => {
    if (a.isBlackedOut !== b.isBlackedOut) return a.isBlackedOut ? 1 : -1;
    const aHas = a.service && subs.has(a.service) ? 0 : 1;
    const bHas = b.service && subs.has(b.service) ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.priority - b.priority;
  });
}

const VMVPD_PRIORITY: StreamingService[] = ["YOUTUBE_TV", "HULU_LIVE", "FUBO", "DIRECTV_STREAM", "SLING"];

function pickVmvpdForRsn(subs: Set<StreamingService>): StreamingService | null {
  for (const s of VMVPD_PRIORITY) if (subs.has(s)) return s;
  return null;
}

function nationalCarrier(callsign: string | null, subs: Set<StreamingService>): StreamingService | null {
  const cs = (callsign ?? "").toUpperCase();
  if (cs.includes("ESPN")) return subs.has("ESPN_PLUS") ? "ESPN_PLUS" : pickVmvpdForRsn(subs);
  if (cs.includes("PEACOCK")) return "PEACOCK";
  if (cs.includes("APPLE")) return "APPLE_TV";
  if (cs.includes("PRIME") || cs.includes("AMAZON")) return "PRIME";
  if (cs.includes("FOX") || cs.includes("TBS") || cs.includes("MLB NET")) return pickVmvpdForRsn(subs);
  return pickVmvpdForRsn(subs);
}

function displayService(s: StreamingService): string {
  switch (s) {
    case "YOUTUBE_TV": return "YouTube TV";
    case "HULU_LIVE": return "Hulu + Live TV";
    case "MLB_TV": return "MLB.tv";
    case "ESPN_PLUS": return "ESPN+";
    case "PEACOCK": return "Peacock";
    case "APPLE_TV": return "Apple TV+";
    case "PRIME": return "Prime Video";
    case "FUBO": return "Fubo";
    case "SLING": return "Sling TV";
    case "DIRECTV_STREAM": return "DirecTV Stream";
    default: return s;
  }
}
