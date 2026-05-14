"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "sw_pwa_install_dismissed";

export default function PwaInstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden || !evt) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setHidden(true);
  };

  const install = async () => {
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      setHidden(true);
    }
  };

  return (
    <div
      className="card"
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "1rem",
        right: "1rem",
        maxWidth: 480,
        margin: "0 auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        zIndex: 20,
      }}
      role="dialog"
      aria-label="Install sports-watch"
    >
      <div
        className="row"
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}
      >
        <div>
          <strong>Install sports-watch</strong>
          <div className="muted" style={{ fontSize: "0.85rem" }}>
            Get a faster, full-screen experience.
          </div>
        </div>
        <div className="row" style={{ gap: "0.5rem" }}>
          <button className="secondary" onClick={dismiss}>
            Not now
          </button>
          <button onClick={install}>Install</button>
        </div>
      </div>
    </div>
  );
}
