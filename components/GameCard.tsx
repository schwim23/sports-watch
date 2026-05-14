import Link from "next/link";
import type { Broadcast, Game, Team } from "@prisma/client";
import type { WatchGroup } from "@/lib/broadcasts/filter";
import { bestPickPerGroup } from "@/lib/broadcasts/filter";
import WatchButton from "./WatchButton";
import TeamLogo from "./TeamLogo";

type Props = {
  game: Game & { homeTeam: Team; awayTeam: Team; broadcasts: Broadcast[] };
  groups: WatchGroup[];
};

function StatusPill({ status }: { status: Game["status"] }) {
  if (status === "IN_PROGRESS") return <span className="pill live">Live</span>;
  if (status === "FINAL") return <span className="pill final">Final</span>;
  if (status === "POSTPONED") return <span className="pill warn">Postponed</span>;
  if (status === "SUSPENDED") return <span className="pill warn">Suspended</span>;
  if (status === "CANCELLED") return <span className="pill danger">Canceled</span>;
  if (status === "PRE_GAME") return <span className="pill scheduled">Pregame</span>;
  if (status === "SCHEDULED") return <span className="pill scheduled">Scheduled</span>;
  return null;
}

export default function GameCard({ game, groups }: Props) {
  const watchable = groups.filter((g) => !g.isBlackedOut);
  const bestOptions = bestPickPerGroup(watchable);
  const primary = bestOptions.find((o) => o.hasSubscription) ?? bestOptions[0] ?? null;
  const carrierCount = watchable.reduce((n, g) => n + g.options.length, 0);

  const startsAt = new Date(game.startsAt);
  const time = startsAt.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const dayShort = startsAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isLive = game.status === "IN_PROGRESS";
  const isFinal = game.status === "FINAL";
  const showScores = isLive || isFinal;

  return (
    <article className="game-card">
      <span className="team-strip" aria-hidden />
      <div className="game-grid">
        <div>
          <div className="matchup">
            <div className="team">
              <TeamLogo team={game.awayTeam} size="md" />
              <div className="stack" style={{ gap: 0 }}>
                <Link
                  href={`/game/${game.id}`}
                  style={{ borderBottom: 0 }}
                  className="team-name"
                >
                  {game.awayTeam.abbreviation}
                </Link>
                <span className="team-city">{game.awayTeam.city}</span>
              </div>
            </div>
            <span className="vs">@</span>
            {showScores ? (
              <span className="score">{game.awayScore ?? 0}</span>
            ) : (
              <span />
            )}

            <div className="team">
              <TeamLogo team={game.homeTeam} size="md" />
              <div className="stack" style={{ gap: 0 }}>
                <Link
                  href={`/game/${game.id}`}
                  style={{ borderBottom: 0 }}
                  className="team-name"
                >
                  {game.homeTeam.abbreviation}
                </Link>
                <span className="team-city">{game.homeTeam.city}</span>
              </div>
            </div>
            <span />
            {showScores ? (
              <span className="score">{game.homeScore ?? 0}</span>
            ) : (
              <span />
            )}
          </div>

          <div className="meta-row">
            <StatusPill status={game.status} />
            {isLive ? (
              <>
                <span className="dot" aria-hidden />
                <span>
                  {game.inningHalf ?? ""} {game.inningOrdinal ?? ""}
                </span>
              </>
            ) : (
              <>
                <span>{dayShort}</span>
                <span className="dot" aria-hidden />
                <span>{time}</span>
              </>
            )}
            {game.venueName ? (
              <>
                <span className="dot" aria-hidden />
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {game.venueName}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="watch-block">
          {primary ? (
            <>
              <div className="broadcast-label">
                On <strong>{primary.broadcastLabel}</strong>
              </div>
              <WatchButton service={primary.service} gamePk={game.externalId} />
              {carrierCount > 1 ? (
                <Link href={`/game/${game.id}`} className="watch-more">
                  {carrierCount} ways to watch →
                </Link>
              ) : null}
            </>
          ) : (
            <div className="broadcast-label">Broadcast TBD</div>
          )}
        </div>
      </div>
    </article>
  );
}
