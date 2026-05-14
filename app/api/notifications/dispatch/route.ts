import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPush } from "@/lib/push/web-push";
import { isQuiet } from "@/lib/push/quiet-hours";

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

  const audit = await prisma.refreshAudit.create({ data: { source: "notifications" } });

  try {
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
    let suppressed = 0;

    for (const game of upcoming) {
      const followers = await prisma.teamFollow.findMany({
        where: {
          OR: [{ teamId: game.homeTeamId }, { teamId: game.awayTeamId }],
          notifyMuted: false,
        },
        select: { userId: true },
      });

      const userIds = Array.from(new Set(followers.map((f) => f.userId)));
      if (userIds.length === 0) continue;

      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, quietStart: true, quietEnd: true, timezone: true },
      });

      for (const user of users) {
        if (isQuiet(user, now)) {
          suppressed++;
          continue;
        }
        const already = await prisma.notificationLog.findUnique({
          where: { userId_gameId_type: { userId: user.id, gameId: game.id, type: TYPE } },
        });
        if (already) continue;

        const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
        if (subs.length === 0) continue;

        const payload = {
          title: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation} starts in 30 min`,
          body: "Tap to see how to watch.",
          url: `/game/${game.id}`,
          unsubscribeUrl: "/settings",
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
          data: { userId: user.id, gameId: game.id, type: TYPE },
        });
      }
    }

    await prisma.refreshAudit.update({
      where: { id: audit.id },
      data: {
        ok: true,
        finishedAt: new Date(),
        rowsProcessed: upcoming.length,
        rowsUpdated: sent,
        rowsSkipped: suppressed + removed,
      },
    });

    return NextResponse.json({
      ok: true,
      sent,
      removed,
      suppressed,
      gamesConsidered: upcoming.length,
    });
  } catch (err) {
    await prisma.refreshAudit.update({
      where: { id: audit.id },
      data: { ok: false, finishedAt: new Date(), errorMessage: (err as Error).message },
    });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
