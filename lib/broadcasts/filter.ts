import type { Broadcast, BroadcastType, StreamingService, Team } from "@prisma/client";
import { isTeamInUserMarket, rsnByTeam } from "@/lib/blackouts/zip-to-rsn";
import {
  carriersForNational,
  carriersForRsn,
  nationalKeyForCallsign,
  type CarrierOption,
} from "@/lib/broadcasts/carriage";

export type WatchOption = {
  broadcastId: string;
  broadcastLabel: string;
  broadcastType: BroadcastType;
  service: StreamingService;
  carrierKind: "vmvpd" | "dtc" | "streaming-exclusive";
  hasSubscription: boolean;
  carriageVerified: boolean;
  isFallbackGuess: boolean;
  isLocal: boolean;
  isBlackedOut: boolean;
  /** lower = better. Composite of has-sub > carriage verified > vmvpd-first > broadcast priority */
  priority: number;
  notes?: string;
};

export type WatchGroup = {
  broadcastId: string;
  broadcastLabel: string;
  broadcastType: BroadcastType;
  isLocal: boolean;
  isBlackedOut: boolean;
  /** options sorted best-first; may be empty if no carrier known and user has no VMVPDs */
  options: WatchOption[];
  /** copy explaining the situation when options is empty */
  emptyNote?: string;
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
 * Services whose presence as STREAMING_EXCLUSIVE means the game is a true
 * national exclusive with no RSN simulcast. Apple TV+ Friday Night Baseball
 * and Peacock Sunday Leadoff are RSN-dark globally. We deliberately exclude
 * PRIME and ESPN_PLUS — those have mixed/per-team simulcast deals, so we
 * trust the StatsAPI broadcasts list for those cases.
 */
const RSN_DARK_EXCLUSIVES = new Set<StreamingService>(["APPLE_TV", "PEACOCK"]);

/**
 * Build the list of "where to watch" groups for this user.
 *
 * Each group corresponds to a single broadcast (e.g. YES, FOX, Apple TV+) and
 * contains one or more concrete WatchOptions — every streaming service that
 * carries that broadcast for this user.
 */
export function filterBroadcasts({ game, user }: FilterArgs): WatchGroup[] {
  const subs = new Set(user.subscriptions);
  const inHomeMarket = isTeamInUserMarket(game.homeTeam.abbreviation, user.zip);
  const inAwayMarket = isTeamInUserMarket(game.awayTeam.abbreviation, user.zip);
  const userIsLocal = inHomeMarket || inAwayMarket;
  const groups: WatchGroup[] = [];

  // If any broadcast is an Apple TV+ or Peacock exclusive, any RSN entries in
  // the same game are stale data from before MLB locked the exclusivity. Drop
  // them so users don't see ghost YES/SNY options for Friday Night Baseball.
  const isRsnDark = game.broadcasts.some(
    (b) =>
      b.type === "STREAMING_EXCLUSIVE" &&
      b.service != null &&
      RSN_DARK_EXCLUSIVES.has(b.service),
  );

  for (const b of game.broadcasts) {
    if (b.type === "RADIO") continue;
    if (isRsnDark && b.type === "LOCAL_RSN") continue;

    if (b.type === "LOCAL_RSN") {
      const group = buildLocalRsnGroup(b, game, user, subs);
      if (group) groups.push(group);
      continue;
    }

    if (b.type === "NATIONAL") {
      groups.push(buildNationalGroup(b, subs));
      continue;
    }

    if (b.type === "STREAMING_EXCLUSIVE" && b.service) {
      groups.push(buildStreamingExclusiveGroup(b, subs, userIsLocal));
    }
  }

  return sortGroups(groups);
}

/**
 * Convenience: flatten groups → single best-pick options list (one per group).
 * Used by GameCard where space is tight.
 */
export function bestPickPerGroup(groups: WatchGroup[]): WatchOption[] {
  return groups.map((g) => g.options[0]).filter((o): o is WatchOption => Boolean(o));
}

function buildLocalRsnGroup(
  b: Broadcast,
  game: FilterArgs["game"],
  user: FilterArgs["user"],
  subs: Set<StreamingService>,
): WatchGroup | null {
  const teamAbbr =
    b.market === "home"
      ? game.homeTeam.abbreviation
      : b.market === "away"
        ? game.awayTeam.abbreviation
        : null;
  const matchesUserMarket = teamAbbr ? isTeamInUserMarket(teamAbbr, user.zip) : false;
  if (!matchesUserMarket) return null;

  const rsn = teamAbbr ? rsnByTeam(teamAbbr) : null;
  const carriers = rsn ? carriersForRsn(rsn.id, subs) : [];
  const broadcastLabel = rsn?.name ?? b.callsign ?? "Local RSN";
  const options = carriers.map((c, i) =>
    toWatchOption(c, b, broadcastLabel, "LOCAL_RSN", i, { isLocal: true, isBlackedOut: false }),
  );

  return {
    broadcastId: b.id,
    broadcastLabel,
    broadcastType: "LOCAL_RSN",
    isLocal: true,
    isBlackedOut: false,
    options,
    emptyNote:
      options.length === 0
        ? `${broadcastLabel} not carried by any major service we track`
        : undefined,
  };
}

function buildNationalGroup(b: Broadcast, subs: Set<StreamingService>): WatchGroup {
  const broadcastLabel = b.callsign ?? "National TV";
  const nationalKey = nationalKeyForCallsign(b.callsign);
  const carriers = nationalKey ? carriersForNational(nationalKey, subs) : [];
  const options = carriers.map((c, i) =>
    toWatchOption(c, b, broadcastLabel, "NATIONAL", i, { isLocal: false, isBlackedOut: false }),
  );

  return {
    broadcastId: b.id,
    broadcastLabel,
    broadcastType: "NATIONAL",
    isLocal: false,
    isBlackedOut: false,
    options,
    emptyNote: options.length === 0 ? "Add a VMVPD subscription to watch this game" : undefined,
  };
}

function buildStreamingExclusiveGroup(
  b: Broadcast,
  subs: Set<StreamingService>,
  userIsLocal: boolean,
): WatchGroup {
  const service = b.service!;
  const broadcastLabel = displayService(service);
  const isBlackedOut = service === "MLB_TV" && userIsLocal;
  const hasSubscription = subs.has(service);

  const option: WatchOption = {
    broadcastId: b.id,
    broadcastLabel,
    broadcastType: "STREAMING_EXCLUSIVE",
    service,
    carrierKind: "streaming-exclusive",
    hasSubscription,
    carriageVerified: true,
    isFallbackGuess: false,
    isLocal: false,
    isBlackedOut,
    priority: priorityFor({
      broadcastType: "STREAMING_EXCLUSIVE",
      hasSubscription,
      carrierKind: "streaming-exclusive",
      carriageVerified: true,
      isFallbackGuess: false,
      tieBreaker: 0,
    }),
    notes: isBlackedOut
      ? "blacked out in your market — use local RSN instead"
      : hasSubscription
        ? "you have this"
        : "needs subscription",
  };

  return {
    broadcastId: b.id,
    broadcastLabel,
    broadcastType: "STREAMING_EXCLUSIVE",
    isLocal: false,
    isBlackedOut,
    options: [option],
  };
}

function toWatchOption(
  c: CarrierOption,
  b: Broadcast,
  broadcastLabel: string,
  broadcastType: BroadcastType,
  tieBreaker: number,
  flags: { isLocal: boolean; isBlackedOut: boolean },
): WatchOption {
  return {
    broadcastId: b.id,
    broadcastLabel,
    broadcastType,
    service: c.service,
    carrierKind: c.carrierKind,
    hasSubscription: c.hasSubscription,
    carriageVerified: c.carriageVerified,
    isFallbackGuess: c.isFallbackGuess,
    isLocal: flags.isLocal,
    isBlackedOut: flags.isBlackedOut,
    priority: priorityFor({
      broadcastType,
      hasSubscription: c.hasSubscription,
      carrierKind: c.carrierKind,
      carriageVerified: c.carriageVerified,
      isFallbackGuess: c.isFallbackGuess,
      tieBreaker,
    }),
    notes: noteFor(c, broadcastLabel),
  };
}

function priorityFor(args: {
  broadcastType: BroadcastType;
  hasSubscription: boolean;
  carrierKind: "vmvpd" | "dtc" | "streaming-exclusive";
  carriageVerified: boolean;
  isFallbackGuess: boolean;
  tieBreaker: number;
}): number {
  let p = 0;
  if (!args.hasSubscription) p += 100;
  if (args.isFallbackGuess) p += 30;
  if (!args.carriageVerified) p += 10;
  if (args.carrierKind === "dtc") p += 5;
  if (args.broadcastType === "NATIONAL") p += 1;
  return p + args.tieBreaker * 0.01;
}

function noteFor(c: CarrierOption, broadcastLabel: string): string {
  if (c.hasSubscription) {
    if (c.isFallbackGuess)
      return `you have this — confirm ${broadcastLabel} is in your channel lineup`;
    if (!c.carriageVerified) return `you have this — ${broadcastLabel} carriage unverified`;
    return "you have this";
  }
  if (c.carrierKind === "dtc")
    return `DTC option — subscribe to ${displayService(c.service)} for ${broadcastLabel}`;
  if (c.isFallbackGuess)
    return `${broadcastLabel} carriage unknown — try ${displayService(c.service)}`;
  if (!c.carriageVerified)
    return `needs ${displayService(c.service)} subscription (carriage unverified)`;
  return `needs ${displayService(c.service)} subscription`;
}

function sortGroups(groups: WatchGroup[]): WatchGroup[] {
  return [...groups].sort((a, b) => {
    if (a.isBlackedOut !== b.isBlackedOut) return a.isBlackedOut ? 1 : -1;
    const aWatchable = a.options.some((o) => o.hasSubscription && !o.isBlackedOut);
    const bWatchable = b.options.some((o) => o.hasSubscription && !o.isBlackedOut);
    if (aWatchable !== bWatchable) return aWatchable ? -1 : 1;
    if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
    const order: Record<BroadcastType, number> = {
      LOCAL_RSN: 0,
      NATIONAL: 1,
      STREAMING_EXCLUSIVE: 2,
      RADIO: 3,
    };
    return order[a.broadcastType] - order[b.broadcastType];
  });
}

export function displayService(s: StreamingService): string {
  switch (s) {
    case "YOUTUBE_TV":
      return "YouTube TV";
    case "HULU_LIVE":
      return "Hulu + Live TV";
    case "MLB_TV":
      return "MLB.tv";
    case "ESPN_PLUS":
      return "ESPN+";
    case "PEACOCK":
      return "Peacock";
    case "APPLE_TV":
      return "Apple TV+";
    case "PRIME":
      return "Prime Video";
    case "FUBO":
      return "Fubo";
    case "SLING":
      return "Sling TV";
    case "DIRECTV_STREAM":
      return "DirecTV Stream";
    case "GOTHAM_SPORTS":
      return "Gotham Sports";
    default:
      return s;
  }
}
