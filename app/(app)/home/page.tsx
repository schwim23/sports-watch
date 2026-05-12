import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { filterBroadcasts } from "@/lib/broadcasts/filter";
import GameCard from "@/components/GameCard";

export const dynamic = "force-dynamic";

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

  const games = await prisma.game.findMany({
    where: {
      sport: "MLB",
      startsAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 6), lte: horizon },
      OR: [
        { homeTeamId: { in: followedTeamIds } },
        { awayTeamId: { in: followedTeamIds } },
      ],
    },
    include: { homeTeam: true, awayTeam: true, broadcasts: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <>
      <h1>Your games</h1>
      {games.length === 0 ? (
        <div className="card">
          <p className="muted">No games for your followed teams in the next 7 days.</p>
        </div>
      ) : (
        games.map((g) => {
          const options = filterBroadcasts({
            game: { id: g.id, homeTeam: g.homeTeam, awayTeam: g.awayTeam, broadcasts: g.broadcasts },
            user: { zip: user.zip, subscriptions: subs },
          });
          return <GameCard key={g.id} game={g} options={options} />;
        })
      )}
    </>
  );
}
