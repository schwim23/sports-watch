import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/push/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

const TYPE = "pre_game_30";

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const lower = new Date(now.getTime() + 1000 * 60 * 25);
  const upper = new Date(now.getTime() + 1000 * 60 * 35);

  const upcoming = await prisma.game.findMany({
    where: {
      sport: "MLB",
      startsAt: { gte: lower, lte: upper },
      status: { in: ["SCHEDULED", "PRE_GAME"] },
    },
    include: { homeTeam: true, awayTeam: true },
  });

  let sent = 0;
  let removed = 0;

  for (const game of upcoming) {
    const followers = await prisma.teamFollow.findMany({
      where: { OR: [{ teamId: game.homeTeamId }, { teamId: game.awayTeamId }] },
      select: { userId: true },
    });

    for (const { userId } of followers) {
      const already = await prisma.notificationLog.findUnique({
        where: { userId_gameId_type: { userId, gameId: game.id, type: TYPE } },
      });
      if (already) continue;

      const subs = await prisma.pushSubscription.findMany({ where: { userId } });
      if (subs.length === 0) continue;

      const payload = {
        title: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} starts in 30 min`,
        body: `Tap to see how to watch.`,
        url: `/game/${game.id}`,
      };

      for (const sub of subs) {
        const result = await sendPush(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        if (result === "gone") {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          removed++;
        } else if (result === "sent") {
          sent++;
        }
      }

      await prisma.notificationLog.create({
        data: { userId, gameId: game.id, type: TYPE },
      });
    }
  }

  return NextResponse.json({ ok: true, sent, removed, gamesConsidered: upcoming.length });
}
