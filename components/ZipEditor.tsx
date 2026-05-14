"use client";

import { useState } from "react";

function isValidUsZip(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) return false;
  const n = Number(zip);
  return n >= 501 && n <= 99950;
}

type State = "idle" | "saving" | "saved" | "error";

export default function ZipEditor({ initialZip }: { initialZip: string }) {
  const [zip, setZip] = useState(initialZip);
  const [saved, setSaved] = useState(initialZip);
  const [state, setState] = useState<State>("idle");
  const dirty = zip !== saved;
  const valid = zip.length === 5 && isValidUsZip(zip);
  const showFormatError = zip.length === 5 && !valid;

  const save = async () => {
    if (!valid) return;
    setState("saving");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zip }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(zip);
      setState("saved");
      setTimeout(() => setState("idle"), 1200);
    } catch {
      setState("error");
    }
  };

  return (
    <div className="stack" style={{ gap: "0.4rem" }}>
      <label
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.08em",
          fontSize: "0.75rem",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Home ZIP
      </label>
      <div className="row" style={{ gap: "0.5rem", alignItems: "center" }}>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          placeholder="10001"
          inputMode="numeric"
          aria-invalid={showFormatError}
          style={{ width: "8ch", fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || !valid || state === "saving"}
          style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
        >
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {state === "saved" ? (
          <span className="pill scheduled" style={{ color: "var(--good)", borderColor: "var(--good)" }}>
            Saved
          </span>
        ) : null}
        {state === "error" ? <span className="pill danger">Save failed</span> : null}
      </div>
      {showFormatError ? (
        <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.85rem" }}>
          Not a valid US ZIP.
        </p>
      ) : null}
    </div>
  );
}
