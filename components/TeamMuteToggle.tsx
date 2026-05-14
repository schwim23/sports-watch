"use client";

import { useState } from "react";

type Props = {
  teamId: string;
  initialMuted: boolean;
};

export default function TeamMuteToggle({ teamId, initialMuted }: Props) {
  const [muted, setMuted] = useState(initialMuted);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    const next = !muted;
    try {
      const res = await fetch("/api/follows", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId, notifyMuted: next }),
      });
      if (res.ok) setMuted(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="secondary"
      onClick={toggle}
      disabled={busy}
      aria-pressed={muted}
      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
    >
      {muted ? "Unmute" : "Mute"}
    </button>
  );
}
