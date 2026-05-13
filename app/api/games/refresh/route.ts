import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchSchedule, mapStatus, type MlbBroadcast } from "@/lib/sources/mlb";
import type { BroadcastType, StreamingService } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function classifyBroadcast(b: MlbBroadcast): {
  type: BroadcastType;
  callsign: string | null;
  market: string | null;
  service: StreamingService | null;
} {
  const name = (b.name ?? b.callSign ?? "").toUpperCase();
  if (b.isNational) {
    let service: StreamingService | null = null;
    if (name.includes("ESPN+")) service = "ESPN_PLUS";
    else if (name.includes("PEACOCK")) service = "PEACOCK";
    else if (name.includes("APPLE")) service = "APPLE_TV";
    else if (name.includes("PRIME") || name.includes("AMAZON")) service = "PRIME";
    if (service) {
      return { type: "STREAMING_EXCLUSIVE", callsign: b.callSign ?? b.name ?? null, market: "national", service };
    }
    return { type: "NATIONAL", callsign: b.callSign ?? b.name ?? null, market: "national", service: null };
  }
  return {
    type: "LOCAL_RSN",
    callsign: b.callSign ?? b.name ?? null,
    market: b.homeAway ?? null,
    service: null,
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = new Date();
  const end = new Date(today);
  end.setUTCDate(today.getUTCDate() + 14);

  const games = await fetchSchedule({ startDate: ymd(today), endDate: ymd(end) });

  const teams = await prisma.team.findMany({ where: { sport: "MLB" } });
  const teamByExt = new Map(teams.map((t) => [t.externalId, t]));

  let upserted = 0;
  let skipped = 0;

  for (const g of games) {
    const homeId = String(g.teams.home.team.id);
    const awayId = String(g.teams.away.team.id);
    const home = teamByExt.get(homeId);
    const away = teamByExt.get(awayId);
    if (!home || !away) {
      skipped++;
      continue;
    }
    const seen = new Set<string>();
    const broadcasts = (g.broadcasts ?? [])
      .map(classifyBroadcast)
      .filter((b) => {
        const key = `${b.type}|${b.callsign ?? ""}|${b.market ?? ""}|${b.service ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    await prisma.game.upsert({
      where: { externalId: String(g.gamePk) },
      create: {
        externalId: String(g.gamePk),
        sport: "MLB",
        homeTeamId: home.id,
        awayTeamId: away.id,
        startsAt: new Date(g.gameDate),
        status: mapStatus(g.status.detailedState),
        venueName: g.venue?.name,
        seasonType: g.seriesDescription ?? null,
        broadcasts: {
          create: broadcasts.map((b) => ({
            type: b.type,
            callsign: b.callsign,
            market: b.market,
            service: b.service,
          })),
        },
      },
      update: {
        startsAt: new Date(g.gameDate),
        status: mapStatus(g.status.detailedState),
        venueName: g.venue?.name,
      },
    });
    upserted++;
  }

  return NextResponse.json({ ok: true, upserted, skipped, fetched: games.length });
}
