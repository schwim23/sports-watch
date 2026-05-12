import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchLiveFeed, mapStatus } from "@/lib/sources/mlb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const feed = await fetchLiveFeed(Number(game.externalId));
    const ls = feed.liveData.linescore;
    const data = {
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
    };
    await prisma.game.update({ where: { id }, data: { ...data, lastSyncedAt: new Date() } });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      inningOrdinal: game.inningOrdinal,
      inningHalf: game.inningHalf,
      outs: game.outs,
      baseState: game.baseState,
    });
  }
}
