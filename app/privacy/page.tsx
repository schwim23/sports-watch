import Link from "next/link";

export const metadata = { title: "Privacy · sports-watch" };

export default function PrivacyPage() {
  return (
    <main className="container">
      <p>
        <Link href="/">← Back</Link>
      </p>
      <article className="stack">
        <h1>Privacy policy</h1>
        <p className="muted">Last updated: May 2026</p>

        <section className="card">
          <h2>What we collect</h2>
          <ul>
            <li>Your email address, name, and profile picture, from Google when you sign in.</li>
            <li>
              Your home ZIP code, used to determine which regional sports networks cover your area.
            </li>
            <li>
              Your streaming subscriptions and followed teams, which you provide during onboarding.
            </li>
            <li>
              Push notification endpoints (browser-issued tokens) when you enable notifications.
            </li>
          </ul>
        </section>

        <section className="card">
          <h2>How we use it</h2>
          <p>
            We use this information only to power the app: showing your games, surfacing the right
            streaming services, and sending pre-game pushes if you opt in. We do not sell or share
            your information with advertisers or third parties.
          </p>
        </section>

        <section className="card">
          <h2>Data we don&apos;t store</h2>
          <p>
            We don&apos;t store payment information (the app is free). We don&apos;t store your
            viewing habits or which Watch buttons you tap.
          </p>
        </section>

        <section className="card">
          <h2>Deleting your account</h2>
          <p>
            You can disconnect Google access from your Google account&apos;s third-party app
            settings. To fully delete your sports-watch profile, contact the maintainer.
          </p>
        </section>

        <section className="card">
          <h2>Third parties</h2>
          <ul>
            <li>Google for sign-in.</li>
            <li>MLB Stats API for game schedules and live data.</li>
            <li>Vercel for hosting; Neon for the Postgres database.</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
