import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { filterBroadcasts } from "@/lib/broadcasts/filter";
import GameCard from "@/components/GameCard";

export const dynamic = "force-dynamic";

function dayKey(d: Date) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function dayLabel(d: Date, today: Date, tomorrow: Date): string {
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscriptions: true, follows: true },
  });
  if (!user) redirect("/login");

  const followedTeamIds = user.follows.map((f) => f.teamId);
  const subs = user.subscriptions.map((s) => s.service);

  const now = new Date();
  const horizon = new Date(now);
  horizon.setUTCDate(now.getUTCDate() + 7);

  const games =
    followedTeamIds.length === 0
      ? []
      : await prisma.game.findMany({
          where: {
            sport: "MLB",
            startsAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 6), lte: horizon },
            OR: [{ homeTeamId: { in: followedTeamIds } }, { awayTeamId: { in: followedTeamIds } }],
          },
          include: { homeTeam: true, awayTeam: true, broadcasts: true },
          orderBy: { startsAt: "asc" },
        });

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const byDay = new Map<string, typeof games>();
  for (const g of games) {
    const k = dayKey(new Date(g.startsAt));
    const arr = byDay.get(k);
    if (arr) arr.push(g);
    else byDay.set(k, [g]);
  }

  return (
    <>
      <h1>Your games</h1>
      {followedTeamIds.length === 0 ? (
        <div className="card">
          <p>
            You&apos;re not following any teams yet. <a href="/onboarding">Pick your teams →</a>
          </p>
        </div>
      ) : games.length === 0 ? (
        <div className="card">
          <p className="muted">No games for your followed teams in the next 7 days.</p>
        </div>
      ) : (
        Array.from(byDay.entries()).map(([k, dayGames]) => {
          const sample = new Date(dayGames[0]!.startsAt);
          return (
            <section key={k} className="stack" style={{ gap: 0 }}>
              <div className="section-heading">
                <h2>{dayLabel(sample, today, tomorrow)}</h2>
                <span className="count">
                  {dayGames.length} GAME{dayGames.length === 1 ? "" : "S"}
                </span>
              </div>
              {dayGames.map((g) => {
                const groups = filterBroadcasts({
                  game: {
                    id: g.id,
                    homeTeam: g.homeTeam,
                    awayTeam: g.awayTeam,
                    broadcasts: g.broadcasts,
                  },
                  user: { zip: user.zip, subscriptions: subs },
                });
                return <GameCard key={g.id} game={g} groups={groups} />;
              })}
            </section>
          );
        })
      )}
    </>
  );
}
