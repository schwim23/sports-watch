"use client";

import { useMemo, useState } from "react";
import blackouts from "@/data/blackouts.json";
import TeamLogo from "./TeamLogo";

type Team = {
  id: string;
  name: string;
  city: string | null;
  abbreviation: string;
  externalId: string;
  logoUrl?: string | null;
};

type Follow = { teamId: string; notifyMuted: boolean };

type RsnSeed = { id: string; name: string; teams: string[]; zip3: string[] };
const RSNS: RsnSeed[] = (blackouts as { rsns: RsnSeed[] }).rsns;

function inMarketTeamsFor(zip: string | null): Set<string> {
  if (!zip || !/^\d{5}$/.test(zip)) return new Set();
  const z3 = zip.slice(0, 3);
  const teams = new Set<string>();
  for (const r of RSNS) {
    if (r.zip3.includes(z3)) for (const t of r.teams) teams.add(t);
  }
  return teams;
}

type RowState = "idle" | "saving" | "error";

export default function TeamsManager({
  teams,
  initialFollows,
  userZip,
}: {
  teams: Team[];
  initialFollows: Follow[];
  userZip: string | null;
}) {
  const [follows, setFollows] = useState<Map<string, Follow>>(
    () => new Map(initialFollows.map((f) => [f.teamId, f])),
  );
  const [rowState, setRowState] = useState<Map<string, RowState>>(new Map());

  const inMarket = useMemo(() => inMarketTeamsFor(userZip), [userZip]);

  const setRow = (teamId: string, state: RowState) => {
    setRowState((prev) => {
      const next = new Map(prev);
      if (state === "idle") next.delete(teamId);
      else next.set(teamId, state);
      return next;
    });
  };

  const toggleFollow = async (team: Team) => {
    const isFollowing = follows.has(team.id);
    setRow(team.id, "saving");
    // Optimistic update
    const prevFollows = follows;
    setFollows((prev) => {
      const next = new Map(prev);
      if (isFollowing) next.delete(team.id);
      else next.set(team.id, { teamId: team.id, notifyMuted: false });
      return next;
    });
    try {
      const res = await fetch("/api/follows", {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setRow(team.id, "idle");
    } catch {
      setFollows(prevFollows);
      setRow(team.id, "error");
    }
  };

  const toggleMute = async (teamId: string) => {
    const current = follows.get(teamId);
    if (!current) return;
    const next = !current.notifyMuted;
    setRow(teamId, "saving");
    setFollows((prev) => {
      const map = new Map(prev);
      map.set(teamId, { teamId, notifyMuted: next });
      return map;
    });
    try {
      const res = await fetch("/api/follows", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId, notifyMuted: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setRow(teamId, "idle");
    } catch {
      setFollows((prev) => {
        const map = new Map(prev);
        map.set(teamId, { teamId, notifyMuted: current.notifyMuted });
        return map;
      });
      setRow(teamId, "error");
    }
  };

  const { followed, available } = useMemo(() => {
    const followedList: Team[] = [];
    const availableList: Team[] = [];
    for (const t of teams) {
      if (follows.has(t.id)) followedList.push(t);
      else availableList.push(t);
    }
    const byCity = (a: Team, b: Team) => (a.city ?? "").localeCompare(b.city ?? "");
    followedList.sort(byCity);
    availableList.sort((a, b) => {
      const aIn = inMarket.has(a.abbreviation);
      const bIn = inMarket.has(b.abbreviation);
      if (aIn !== bIn) return aIn ? -1 : 1;
      return byCity(a, b);
    });
    return { followed: followedList, available: availableList };
  }, [teams, follows, inMarket]);

  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="section-heading">
        <h2>Following</h2>
        <span className="count">
          {followed.length} TEAM{followed.length === 1 ? "" : "S"}
        </span>
      </div>

      {followed.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            You&apos;re not following anyone yet. Pick teams below to start.
          </p>
        </div>
      ) : (
        <ul
          className="stack"
          style={{ listStyle: "none", padding: 0, margin: 0, gap: "0.4rem" }}
        >
          {followed.map((t) => {
            const f = follows.get(t.id)!;
            const state = rowState.get(t.id);
            return (
              <li key={t.id} className="team-row team-row-followed">
                <div className="row" style={{ gap: "0.75rem", flex: 1, minWidth: 0 }}>
                  <TeamLogo team={t} size="md" />
                  <div style={{ minWidth: 0 }}>
                    <div className="team-row-name">
                      {t.city} {t.name}
                    </div>
                    <div className="row" style={{ gap: "0.4rem" }}>
                      {inMarket.has(t.abbreviation) ? (
                        <span className="pill scheduled">In your market</span>
                      ) : null}
                      {f.notifyMuted ? <span className="pill warn">Muted</span> : null}
                      {state === "error" ? (
                        <span className="pill danger">Save failed</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="row" style={{ gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => toggleMute(t.id)}
                    disabled={state === "saving"}
                    aria-pressed={f.notifyMuted}
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                  >
                    {f.notifyMuted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => toggleFollow(t)}
                    disabled={state === "saving"}
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                  >
                    Unfollow
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="section-heading">
        <h2>Available</h2>
        <span className="count">
          {available.length} TEAM{available.length === 1 ? "" : "S"}
        </span>
      </div>

      <ul
        className="stack"
        style={{ listStyle: "none", padding: 0, margin: 0, gap: "0.35rem" }}
      >
        {available.map((t) => {
          const state = rowState.get(t.id);
          const isLocal = inMarket.has(t.abbreviation);
          return (
            <li key={t.id} className="team-row">
              <div className="row" style={{ gap: "0.75rem", flex: 1, minWidth: 0 }}>
                <TeamLogo team={t} size="md" />
                <div style={{ minWidth: 0 }}>
                  <div className="team-row-name">
                    {t.city} {t.name}
                  </div>
                  {isLocal ? (
                    <span className="pill scheduled">In your market</span>
                  ) : null}
                  {state === "error" ? (
                    <span className="pill danger" style={{ marginLeft: "0.4rem" }}>
                      Save failed
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleFollow(t)}
                disabled={state === "saving"}
                style={{ padding: "0.35rem 0.85rem", fontSize: "0.82rem" }}
              >
                Follow
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
