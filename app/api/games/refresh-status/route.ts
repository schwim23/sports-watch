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

  const audit = await prisma.refreshAudit.create({ data: { source: "live-status" } });

  try {
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
    let skipped = 0;
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
        skipped++;
      }
    }

    await prisma.refreshAudit.update({
      where: { id: audit.id },
      data: {
        ok: true,
        finishedAt: new Date(),
        rowsProcessed: games.length,
        rowsUpdated: updated,
        rowsSkipped: skipped,
      },
    });

    return NextResponse.json({ ok: true, updated, considered: games.length });
  } catch (err) {
    await prisma.refreshAudit.update({
      where: { id: audit.id },
      data: { ok: false, finishedAt: new Date(), errorMessage: (err as Error).message },
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
