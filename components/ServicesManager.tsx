"use client";

import { useState } from "react";

const SERVICES = [
  { id: "MLB_TV", label: "MLB.tv", note: "out-of-market games" },
  { id: "YOUTUBE_TV", label: "YouTube TV", note: "live TV bundle" },
  { id: "HULU_LIVE", label: "Hulu + Live TV", note: "live TV bundle" },
  { id: "FUBO", label: "Fubo", note: "live TV bundle" },
  { id: "DIRECTV_STREAM", label: "DirecTV Stream", note: "live TV bundle" },
  { id: "SLING", label: "Sling TV", note: "live TV bundle" },
  { id: "ESPN_PLUS", label: "ESPN+", note: "select MLB games" },
  { id: "PEACOCK", label: "Peacock", note: "Sunday Leadoff" },
  { id: "APPLE_TV", label: "Apple TV+", note: "Friday Night Baseball" },
  { id: "PRIME", label: "Prime Video", note: "exclusive packages" },
  { id: "GOTHAM_SPORTS", label: "Gotham Sports", note: "YES + SNY direct" },
] as const;

type ServiceId = (typeof SERVICES)[number]["id"];
const SERVICE_IDS = new Set<string>(SERVICES.map((s) => s.id));

type SaveState = "idle" | "saving" | "error" | "saved";

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M3 8.5L6.5 12L13 4.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ServicesManager({ initialSubs }: { initialSubs: string[] }) {
  const [subs, setSubs] = useState<Set<ServiceId>>(
    () => new Set(initialSubs.filter((s): s is ServiceId => SERVICE_IDS.has(s))),
  );
  const [state, setState] = useState<Map<ServiceId, SaveState>>(new Map());

  const setRow = (id: ServiceId, s: SaveState) => {
    setState((prev) => {
      const next = new Map(prev);
      if (s === "idle") next.delete(id);
      else next.set(id, s);
      return next;
    });
  };

  const toggle = async (id: ServiceId) => {
    const isOn = subs.has(id);
    const nextSubs = new Set(subs);
    if (isOn) nextSubs.delete(id);
    else nextSubs.add(id);

    setRow(id, "saving");
    setSubs(nextSubs);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscriptions: Array.from(nextSubs) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setRow(id, "saved");
      setTimeout(() => setRow(id, "idle"), 900);
    } catch {
      setSubs((prev) => {
        const rolled = new Set(prev);
        if (isOn) rolled.add(id);
        else rolled.delete(id);
        return rolled;
      });
      setRow(id, "error");
    }
  };

  return (
    <div className="service-grid">
      {SERVICES.map((s) => {
        const on = subs.has(s.id);
        const st = state.get(s.id);
        const tileClass = ["service-tile", on ? "on" : "", st === "saving" ? "saving" : "", st === "error" ? "error" : ""]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            type="button"
            key={s.id}
            className={tileClass}
            onClick={() => toggle(s.id)}
            disabled={st === "saving"}
            aria-pressed={on}
            style={{ textAlign: "left", textTransform: "none" }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span style={{ letterSpacing: "0.03em" }}>{s.label}</span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.01em",
                  color: "var(--muted)",
                  textTransform: "none",
                  fontWeight: 400,
                }}
              >
                {st === "error" ? "Save failed — tap to retry" : s.note}
              </span>
            </span>
            <span className="check" aria-hidden>
              <CheckIcon />
            </span>
          </button>
        );
      })}
    </div>
  );
}
