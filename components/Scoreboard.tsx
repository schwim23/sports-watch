"use client";

import { useEffect, useState } from "react";

type State = {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  inningOrdinal: string | null;
  inningHalf: string | null;
  outs: number | null;
  baseState: { first?: boolean; second?: boolean; third?: boolean } | null;
  homeAbbr: string;
  awayAbbr: string;
};

const POLL_MS = 15_000;

export default function Scoreboard({ gameId, initial }: { gameId: string; initial: State }) {
  const [state, setState] = useState(initial);
  const [err, setErr] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let delay = POLL_MS;

    const tick = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/live`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) {
          setState((s) => ({ ...s, ...data }));
          delay = POLL_MS;
          setErr(0);
        }
      } catch {
        if (!cancelled) {
          delay = Math.min(delay * 2, 120_000);
          setErr((n) => n + 1);
        }
      }
      if (!cancelled && state.status !== "FINAL") setTimeout(tick, delay);
    };

    const t = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [gameId, state.status]);

  const bases = state.baseState ?? {};
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div><strong>{state.awayAbbr}</strong> {state.awayScore ?? 0}</div>
          <div><strong>{state.homeAbbr}</strong> {state.homeScore ?? 0}</div>
        </div>
        <div className="stack" style={{ alignItems: "flex-end" }}>
          <div>{state.inningHalf ?? ""} {state.inningOrdinal ?? ""}</div>
          <div className="muted">Outs: {state.outs ?? 0}</div>
          <div className="muted">
            Bases: {bases.first ? "1B " : ""}{bases.second ? "2B " : ""}{bases.third ? "3B" : ""}
            {!bases.first && !bases.second && !bases.third ? "—" : ""}
          </div>
          {err > 0 ? <div className="muted">Refresh delayed…</div> : null}
        </div>
      </div>
    </div>
  );
}
