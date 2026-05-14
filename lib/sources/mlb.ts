import { z } from "zod";

const BASE = process.env.MLB_STATSAPI_BASE ?? "https://statsapi.mlb.com/api";

const broadcastSchema = z.object({
  type: z.string().optional(),
  name: z.string().optional(),
  callSign: z.string().optional(),
  homeAway: z.enum(["home", "away", "national"]).optional(),
  isNational: z.boolean().optional(),
  language: z.string().optional(),
});

const gameSchema = z.object({
  gamePk: z.number(),
  gameDate: z.string(),
  status: z.object({
    abstractGameState: z.string(),
    detailedState: z.string(),
    statusCode: z.string().optional(),
  }),
  teams: z.object({
    home: z.object({
      team: z.object({ id: z.number(), name: z.string() }),
      score: z.number().optional(),
    }),
    away: z.object({
      team: z.object({ id: z.number(), name: z.string() }),
      score: z.number().optional(),
    }),
  }),
  venue: z.object({ name: z.string().optional() }).optional(),
  broadcasts: z.array(broadcastSchema).optional(),
  seriesDescription: z.string().optional(),
  seasonDisplay: z.string().optional(),
});

const scheduleSchema = z.object({
  dates: z.array(
    z.object({
      date: z.string(),
      games: z.array(gameSchema),
    }),
  ),
});

const liveFeedSchema = z.object({
  gameData: z.object({
    status: z.object({
      abstractGameState: z.string(),
      detailedState: z.string(),
    }),
  }),
  liveData: z.object({
    linescore: z.object({
      currentInning: z.number().optional(),
      currentInningOrdinal: z.string().optional(),
      inningHalf: z.string().optional(),
      isTopInning: z.boolean().optional(),
      outs: z.number().optional(),
      teams: z
        .object({
          home: z.object({ runs: z.number().optional() }).optional(),
          away: z.object({ runs: z.number().optional() }).optional(),
        })
        .optional(),
      offense: z
        .object({
          first: z.object({ id: z.number() }).optional(),
          second: z.object({ id: z.number() }).optional(),
          third: z.object({ id: z.number() }).optional(),
        })
        .optional(),
    }),
  }),
});

export type MlbGame = z.infer<typeof gameSchema>;
export type MlbBroadcast = z.infer<typeof broadcastSchema>;
export type MlbLiveFeed = z.infer<typeof liveFeedSchema>;

export async function fetchSchedule(opts: {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  sportId?: number; // 1 = MLB
  hydrate?: string;
}): Promise<MlbGame[]> {
  const params = new URLSearchParams({
    sportId: String(opts.sportId ?? 1),
    startDate: opts.startDate,
    endDate: opts.endDate,
    hydrate: opts.hydrate ?? "broadcasts(all),linescore,venue,team",
  });
  const url = `${BASE}/v1/schedule?${params.toString()}`;
  const res = await fetch(url, { headers: { "User-Agent": "sports-watch/0.1" } });
  if (!res.ok) {
    throw new Error(`MLB schedule fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const parsed = scheduleSchema.parse(json);
  return parsed.dates.flatMap((d) => d.games);
}

export async function fetchLiveFeed(gamePk: number): Promise<MlbLiveFeed> {
  const url = `${BASE}/v1.1/game/${gamePk}/feed/live`;
  const res = await fetch(url, { headers: { "User-Agent": "sports-watch/0.1" } });
  if (!res.ok) {
    throw new Error(`MLB live feed fetch failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return liveFeedSchema.parse(json);
}

export function mapStatus(detailedState: string): import("@prisma/client").GameStatus {
  const s = detailedState.toLowerCase();
  if (s.includes("final") || s.includes("completed")) return "FINAL";
  if (s.includes("postponed")) return "POSTPONED";
  if (s.includes("suspended")) return "SUSPENDED";
  if (s.includes("cancel")) return "CANCELLED";
  if (s.includes("in progress") || s.includes("manager challenge") || s.includes("delayed: "))
    return "IN_PROGRESS";
  if (s.includes("warmup") || s.includes("pre-game") || s.includes("delayed start"))
    return "PRE_GAME";
  return "SCHEDULED";
}
