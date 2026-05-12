import Link from "next/link";
import type { Broadcast, Game, Team } from "@prisma/client";
import type { WatchOption } from "@/lib/broadcasts/filter";
import WatchButton from "./WatchButton";

type Props = {
  game: Game & { homeTeam: Team; awayTeam: Team; broadcasts: Broadcast[] };
  options: WatchOption[];
};

export default function GameCard({ game, options }: Props) {
  const best = options.find((o) => !o.isBlackedOut) ?? null;
  const time = new Date(game.startsAt).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div>
            <Link href={`/game/${game.id}`}>
              <strong>{game.awayTeam.abbreviation}</strong> @ <strong>{game.homeTeam.abbreviation}</strong>
            </Link>
          </div>
          <div className="muted">{time} · {game.venueName ?? ""}</div>
          {game.status === "IN_PROGRESS" ? (
            <div>
              <strong>{game.awayScore ?? 0} – {game.homeScore ?? 0}</strong>{" "}
              <span className="muted">{game.inningHalf ?? ""} {game.inningOrdinal ?? ""}</span>
            </div>
          ) : null}
        </div>
        {best?.service ? (
          <div className="stack" style={{ alignItems: "flex-end" }}>
            <div className="muted">{best.label}</div>
            <WatchButton service={best.service} gamePk={game.externalId} />
          </div>
        ) : (
          <div className="muted">{best?.label ?? "Broadcast TBD"}</div>
        )}
      </div>
    </div>
  );
}
