"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string; city: string | null; abbreviation: string };

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

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const submit = async () => {
    setSaving(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ zip, subscriptions: Array.from(subs) }),
    });
    for (const teamId of follows) {
      await fetch("/api/follows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
    }
    router.push("/home");
    router.refresh();
  };

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
        />
      </div>
      <div className="card">
        <h2>Streaming subscriptions</h2>
        <p className="muted">We'll only show options you can actually watch.</p>
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
        <div className="stack">
          {teams.map((t) => (
            <label key={t.id} className="row">
              <input
                type="checkbox"
                checked={follows.has(t.id)}
                onChange={() => setFollows((prev) => toggle(prev, t.id))}
              />
              {t.city} {t.name}
            </label>
          ))}
        </div>
      </div>
      <button disabled={saving || !zip || follows.size === 0} onClick={submit}>
        {saving ? "Saving…" : "Save and continue"}
      </button>
    </div>
  );
}
