"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import blackouts from "@/data/blackouts.json";
import TeamLogo from "@/components/TeamLogo";

type Team = {
  id: string;
  name: string;
  city: string | null;
  abbreviation: string;
  externalId: string;
  logoUrl?: string | null;
};

const SERVICES = [
  { id: "MLB_TV", label: "MLB.tv" },
  { id: "YOUTUBE_TV", label: "YouTube TV" },
  { id: "HULU_LIVE", label: "Hulu + Live TV" },
  { id: "FUBO", label: "Fubo" },
  { id: "ESPN_PLUS", label: "ESPN+" },
  { id: "PEACOCK", label: "Peacock" },
  { id: "APPLE_TV", label: "Apple TV+" },
  { id: "PRIME", label: "Prime Video" },
  { id: "SLING", label: "Sling TV" },
  { id: "DIRECTV_STREAM", label: "DirecTV Stream" },
] as const;

type RsnSeed = { id: string; name: string; teams: string[]; zip3: string[] };
const RSNS: RsnSeed[] = (blackouts as { rsns: RsnSeed[] }).rsns;

function isValidUsZip(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) return false;
  const n = Number(zip);
  // US ZIPs run roughly 00501 (Holtsville NY) to 99950 (Ketchikan AK).
  return n >= 501 && n <= 99950;
}

function inMarketTeamsFor(zip: string): Set<string> {
  if (!isValidUsZip(zip)) return new Set();
  const z3 = zip.slice(0, 3);
  const teams = new Set<string>();
  for (const r of RSNS) {
    if (r.zip3.includes(z3)) for (const t of r.teams) teams.add(t);
  }
  return teams;
}

export default function OnboardingForm({
  teams,
  initialZip,
  initialSubs,
  initialFollows,
}: {
  teams: Team[];
  initialZip: string;
  initialSubs: string[];
  initialFollows: string[];
}) {
  const router = useRouter();
  const [zip, setZip] = useState(initialZip);
  const [subs, setSubs] = useState(new Set(initialSubs));
  const [follows, setFollows] = useState(new Set(initialFollows));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zipIsValid = isValidUsZip(zip);
  const inMarket = useMemo(() => inMarketTeamsFor(zip), [zip]);
  const zipHasRsn = zipIsValid && inMarket.size > 0;
  const initialZipSet = useMemo(() => new Set(initialFollows), [initialFollows]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const submit = async () => {
    setError(null);
    if (!zipIsValid) {
      setError("Enter a valid 5-digit US ZIP code.");
      return;
    }
    setSaving(true);
    try {
      const meRes = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zip, subscriptions: Array.from(subs) }),
      });
      if (!meRes.ok) throw new Error("Failed to save profile");

      const toFollow = Array.from(follows).filter((id) => !initialZipSet.has(id));
      const toUnfollow = Array.from(initialZipSet).filter((id) => !follows.has(id));
      await Promise.all([
        ...toFollow.map((teamId) =>
          fetch("/api/follows", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ teamId }),
          }),
        ),
        ...toUnfollow.map((teamId) =>
          fetch("/api/follows", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ teamId }),
          }),
        ),
      ]);
      router.push("/home");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const teamsSorted = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aIn = inMarket.has(a.abbreviation);
      const bIn = inMarket.has(b.abbreviation);
      if (aIn !== bIn) return aIn ? -1 : 1;
      return (a.city ?? "").localeCompare(b.city ?? "");
    });
  }, [teams, inMarket]);

  return (
    <div className="stack">
      <div className="card">
        <h2>Home ZIP</h2>
        <p className="muted">Used to figure out which RSN(s) cover your area.</p>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="10001"
          inputMode="numeric"
          aria-invalid={zip.length === 5 && !zipIsValid}
        />
        {zip.length === 5 && !zipIsValid ? (
          <p style={{ color: "var(--danger, #c33)" }}>Not a valid US ZIP.</p>
        ) : null}
        {zipIsValid && !zipHasRsn ? (
          <p className="muted">No MLB RSN covers this ZIP — out-of-market viewers use MLB.tv.</p>
        ) : null}
      </div>
      <div className="card">
        <h2>Streaming subscriptions</h2>
        <p className="muted">We&apos;ll only show options you can actually watch.</p>
        <div className="stack">
          {SERVICES.map((s) => (
            <label key={s.id} className="row">
              <input
                type="checkbox"
                checked={subs.has(s.id)}
                onChange={() => setSubs((prev) => toggle(prev, s.id))}
              />
              {s.label}
            </label>
          ))}
        </div>
      </div>
      <div className="card">
        <h2>Follow MLB teams</h2>
        {zipHasRsn ? <p className="muted">Teams in your local market are shown first.</p> : null}
        <div className="stack">
          {teamsSorted.map((t) => {
            const local = inMarket.has(t.abbreviation);
            return (
              <label key={t.id} className="row" style={{ gap: "0.65rem" }}>
                <input
                  type="checkbox"
                  checked={follows.has(t.id)}
                  onChange={() => setFollows((prev) => toggle(prev, t.id))}
                />
                <TeamLogo team={t} size="sm" />
                <span
                  style={{ fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}
                >
                  {t.city} {t.name}
                </span>
                {local ? (
                  <span className="pill scheduled" style={{ marginLeft: "0.25rem" }}>
                    In your market
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </div>
      {error ? <p style={{ color: "var(--danger, #c33)" }}>{error}</p> : null}
      <button disabled={saving || !zipIsValid || follows.size === 0} onClick={submit}>
        {saving ? "Saving…" : "Save and continue"}
      </button>
    </div>
  );
}
