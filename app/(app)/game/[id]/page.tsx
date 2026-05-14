import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { filterBroadcasts, displayService } from "@/lib/broadcasts/filter";
import WatchButton from "@/components/WatchButton";
import Scoreboard from "@/components/Scoreboard";
import TeamLogo from "@/components/TeamLogo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id }, select: { externalId: true } });
  // MLB At Bat / MLB.tv app id on the App Store
  const appArgument = game ? `https://www.mlb.com/tv/g${game.externalId}` : undefined;
  return {
    other: appArgument
      ? { "apple-itunes-app": `app-id=493619333, app-argument=${appArgument}` }
      : undefined,
  };
}

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

  const groups = filterBroadcasts({
    game: {
      id: game.id,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      broadcasts: game.broadcasts,
    },
    user: { zip: me.zip, subscriptions: me.subscriptions.map((s) => s.service) },
  });

  const icsHref = `/api/games/${game.id}/ics`;

  const startsAt = new Date(game.startsAt);
  return (
    <>
      <div
        className="row"
        style={{
          gap: "1.25rem",
          alignItems: "center",
          margin: "0.75rem 0 0.5rem",
          flexWrap: "wrap",
        }}
      >
        <TeamLogo team={game.awayTeam} size="lg" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ margin: 0, lineHeight: 1 }}>
            {game.awayTeam.abbreviation} <span style={{ color: "var(--muted-soft)" }}>@</span>{" "}
            {game.homeTeam.abbreviation}
          </h1>
          <p className="muted" style={{ marginTop: "0.35rem", letterSpacing: "0.02em" }}>
            {game.awayTeam.city} {game.awayTeam.name} at {game.homeTeam.city}{" "}
            {game.homeTeam.name}
          </p>
        </div>
        <TeamLogo team={game.homeTeam} size="lg" />
      </div>
      <p
        className="muted"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontSize: "0.85rem",
        }}
      >
        {startsAt.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}{" "}
        · {game.venueName ?? "Venue TBD"} · {game.status.replace("_", " ")}
      </p>

      {game.status === "POSTPONED" ? (
        <div className="card" style={{ borderColor: "var(--danger, #c33)" }}>
          <strong>Game postponed.</strong> A makeup date will be scheduled — refresh later for
          updates.
        </div>
      ) : null}
      {game.status === "SUSPENDED" ? (
        <div className="card" style={{ borderColor: "var(--danger, #c33)" }}>
          <strong>Game suspended.</strong> Resume time TBD.
        </div>
      ) : null}

      {game.status === "IN_PROGRESS" || game.status === "PRE_GAME" ? (
        <Scoreboard
          gameId={game.id}
          initial={{
            status: game.status,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            inningOrdinal: game.inningOrdinal,
            inningHalf: game.inningHalf,
            outs: game.outs,
            baseState: game.baseState as {
              first?: boolean;
              second?: boolean;
              third?: boolean;
            } | null,
            homeAbbr: game.homeTeam.abbreviation,
            awayAbbr: game.awayTeam.abbreviation,
          }}
        />
      ) : null}

      <div className="card">
        <h2>How to watch</h2>
        {groups.length === 0 ? (
          <p className="muted">No broadcast info available yet.</p>
        ) : (
          <div>
            {groups.map((group) => (
              <div key={group.broadcastId} className="broadcast-group">
                <div className="head">
                  <strong>{group.broadcastLabel}</strong>
                  {group.isLocal ? <span className="pill scheduled">In your market</span> : null}
                  {group.isBlackedOut ? <span className="pill danger">Blacked out</span> : null}
                </div>
                {group.options.length === 0 ? (
                  <div className="muted" style={{ marginTop: "0.4rem" }}>
                    {group.emptyNote ?? "No carriers known"}
                  </div>
                ) : (
                  <ul className="carrier-list">
                    {group.options.map((o) => (
                      <li
                        key={`${o.broadcastId}-${o.service}-${o.carrierKind}`}
                        className={o.hasSubscription ? "has-sub" : undefined}
                      >
                        <div>
                          <strong style={{ letterSpacing: "0.02em" }}>
                            {displayService(o.service)}
                          </strong>
                          {o.carrierKind === "dtc" ? (
                            <span className="muted"> · direct-to-consumer</span>
                          ) : null}
                          {o.hasSubscription ? (
                            <span
                              className="pill scheduled"
                              style={{
                                marginLeft: "0.5rem",
                                color: "var(--mlb-navy)",
                                borderColor: "var(--mlb-navy)",
                              }}
                            >
                              You have this
                            </span>
                          ) : null}
                          {!o.carriageVerified && !o.hasSubscription ? (
                            <span className="muted"> · unverified</span>
                          ) : null}
                        </div>
                        {o.isBlackedOut ? null : (
                          <WatchButton service={o.service} gamePk={game.externalId} small />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {groups.length > 0 && groups.every((g) => g.options.every((o) => !o.hasSubscription)) ? (
          <p className="muted" style={{ marginTop: "1rem" }}>
            You don&apos;t have a subscription that carries this game. Subscribe to one above, or
            check the <a href="/settings">subscriptions page</a> to add services.
          </p>
        ) : null}
      </div>

      <p>
        <a href={icsHref}>Add to calendar (.ics)</a>
      </p>
    </>
  );
}
