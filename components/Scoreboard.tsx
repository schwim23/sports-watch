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

function Diamond({ first, second, third }: { first?: boolean; second?: boolean; third?: boolean }) {
  // Standard baseball diamond rotated 45°: home bottom, 1B right, 2B top, 3B left.
  return (
    <svg className="diamond" viewBox="0 0 64 64" aria-label="bases">
      <g transform="translate(32 32) rotate(45)">
        <rect className={`base ${second ? "on" : ""}`} x="-26" y="-26" width="12" height="12" rx="1" />
        <rect className={`base ${third ? "on" : ""}`} x="-26" y="14" width="12" height="12" rx="1" />
        <rect className={`base ${first ? "on" : ""}`} x="14" y="-26" width="12" height="12" rx="1" />
        <rect
          fill="rgba(255,255,255,0.15)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="2"
          x="14"
          y="14"
          width="12"
          height="12"
          rx="1"
        />
      </g>
    </svg>
  );
}

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
  const outs = state.outs ?? 0;
  const isLive = state.status === "IN_PROGRESS";

  return (
    <div className="scoreboard">
      <div className="scoreboard-grid">
        <div className="sb-teams">
          <div className="sb-team">
            <span className="abbr">{state.awayAbbr}</span>
          </div>
          <span />
          <span className="score">{state.awayScore ?? 0}</span>

          <div className="sb-team">
            <span className="abbr">{state.homeAbbr}</span>
          </div>
          <span />
          <span className="score">{state.homeScore ?? 0}</span>
        </div>

        <div className="sb-state">
          {isLive ? (
            <>
              <span className="inning">
                <span className="half">{state.inningHalf ?? "—"}</span>
                {state.inningOrdinal ?? ""}
              </span>
              <Diamond first={bases.first} second={bases.second} third={bases.third} />
              <div className="outs" aria-label={`${outs} outs`}>
                <span className={`dot ${outs >= 1 ? "on" : ""}`} />
                <span className={`dot ${outs >= 2 ? "on" : ""}`} />
                <span className={`dot ${outs >= 3 ? "on" : ""}`} />
                <span style={{ marginLeft: 6, fontSize: "0.78rem", letterSpacing: "0.12em" }}>
                  OUT{outs === 1 ? "" : "S"}
                </span>
              </div>
            </>
          ) : (
            <span className="inning">{state.status.replace("_", " ")}</span>
          )}
          {err > 0 ? <div className="sb-stale">Refresh delayed…</div> : null}
        </div>
      </div>
    </div>
  );
}
