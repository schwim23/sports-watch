"use client";

import { useState } from "react";

type Props = {
  initialQuietStart: number | null;
  initialQuietEnd: number | null;
  initialTimezone: string | null;
};

const HOURS = Array.from({ length: 24 }, (_, h) => h);

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export default function NotificationPrefs({
  initialQuietStart,
  initialQuietEnd,
  initialTimezone,
}: Props) {
  const [enabled, setEnabled] = useState(initialQuietStart !== null && initialQuietEnd !== null);
  const [start, setStart] = useState(initialQuietStart ?? 23);
  const [end, setEnd] = useState(initialQuietEnd ?? 8);
  const [tz, setTz] = useState(initialTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quietStart: enabled ? start : null,
          quietEnd: enabled ? end : null,
          timezone: tz || null,
        }),
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <label className="row">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable quiet hours
      </label>
      {enabled ? (
        <>
          <div className="row" style={{ gap: "0.5rem" }}>
            <label>
              From{" "}
              <select value={start} onChange={(e) => setStart(Number(e.target.value))}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              To{" "}
              <select value={end} onChange={(e) => setEnd(Number(e.target.value))}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Timezone{" "}
            <input
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              placeholder="America/New_York"
            />
          </label>
          <p className="muted">Notifications scheduled in this window will be skipped.</p>
        </>
      ) : null}
      <button onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save preferences"}
      </button>
      {saved ? <p className="muted">Saved.</p> : null}
    </div>
  );
}
