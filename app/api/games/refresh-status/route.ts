import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchLiveFeed, mapStatus } from "@/lib/sources/mlb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const windowStart = new Date(now.getTime() - 1000 * 60 * 60 * 6);
  const windowEnd = new Date(now.getTime() + 1000 * 60 * 60 * 3);

  const games = await prisma.game.findMany({
    where: {
      sport: "MLB",
      startsAt: { gte: windowStart, lte: windowEnd },
      status: { in: ["SCHEDULED", "PRE_GAME", "IN_PROGRESS"] },
    },
    select: { id: true, externalId: true },
    take: 30,
  });

  let updated = 0;
  for (const g of games) {
    try {
      const feed = await fetchLiveFeed(Number(g.externalId));
      const ls = feed.liveData.linescore;
      await prisma.game.update({
        where: { id: g.id },
        data: {
          status: mapStatus(feed.gameData.status.detailedState),
          homeScore: ls.teams?.home?.runs ?? null,
          awayScore: ls.teams?.away?.runs ?? null,
          inningOrdinal: ls.currentInningOrdinal ?? null,
          inningHalf: ls.inningHalf ?? null,
          outs: ls.outs ?? null,
          baseState: {
            first: !!ls.offense?.first,
            second: !!ls.offense?.second,
            third: !!ls.offense?.third,
          },
          lastSyncedAt: new Date(),
        },
      });
      updated++;
    } catch {
      // Skip; nightly smoke test will flag persistent errors.
    }
  }

  return NextResponse.json({ ok: true, updated, considered: games.length });
}
