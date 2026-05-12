import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { filterBroadcasts } from "@/lib/broadcasts/filter";
import WatchButton from "@/components/WatchButton";
import Scoreboard from "@/components/Scoreboard";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [game, me] = await Promise.all([
    prisma.game.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true, broadcasts: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscriptions: true },
    }),
  ]);

  if (!game || !me) notFound();

  const options = filterBroadcasts({
    game: { id: game.id, homeTeam: game.homeTeam, awayTeam: game.awayTeam, broadcasts: game.broadcasts },
    user: { zip: me.zip, subscriptions: me.subscriptions.map((s) => s.service) },
  });

  const icsHref = `/api/games/${game.id}/ics`;

  return (
    <>
      <h1>{game.awayTeam.city} {game.awayTeam.name} @ {game.homeTeam.city} {game.homeTeam.name}</h1>
      <p className="muted">{new Date(game.startsAt).toLocaleString()} · {game.venueName ?? "Venue TBD"} · {game.status}</p>

      {game.status === "IN_PROGRESS" || game.status === "PRE_GAME" ? (
        <Scoreboard gameId={game.id} initial={{
          status: game.status,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
          inningOrdinal: game.inningOrdinal,
          inningHalf: game.inningHalf,
          outs: game.outs,
          baseState: game.baseState as { first?: boolean; second?: boolean; third?: boolean } | null,
          homeAbbr: game.homeTeam.abbreviation,
          awayAbbr: game.awayTeam.abbreviation,
        }} />
      ) : null}

      <div className="card">
        <h2>How to watch</h2>
        {options.length === 0 ? (
          <p className="muted">No broadcast info available yet.</p>
        ) : (
          <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
            {options.map((o) => (
              <li key={o.broadcastId} className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div><strong>{o.label}</strong>{o.isBlackedOut ? " · BLACKED OUT" : ""}</div>
                  {o.notes ? <div className="muted">{o.notes}</div> : null}
                </div>
                {o.service && !o.isBlackedOut ? <WatchButton service={o.service} gamePk={game.externalId} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p><a href={icsHref}>Add to calendar (.ics)</a></p>
    </>
  );
}
