import Link from "next/link";

export const metadata = { title: "Terms · sports-watch" };

export default function TermsPage() {
  return (
    <main className="container">
      <p>
        <Link href="/">← Back</Link>
      </p>
      <article className="stack">
        <h1>Terms of service</h1>
        <p className="muted">Last updated: May 2026</p>

        <section className="card">
          <h2>What sports-watch is</h2>
          <p>
            sports-watch is a free informational service that tells you where your favorite
            teams&apos; games are airing. We don&apos;t stream games ourselves; we deep-link into
            the streaming services that do.
          </p>
        </section>

        <section className="card">
          <h2>No warranty</h2>
          <p>
            Schedule and broadcast data comes from public sources (primarily MLB Stats API) and may
            be incorrect or out of date. Carriage information for streaming services changes
            frequently; we do our best to keep it accurate but make no guarantees. Always verify
            before subscribing to a service.
          </p>
        </section>

        <section className="card">
          <h2>Acceptable use</h2>
          <p>
            Don&apos;t use the app for automated scraping or to overwhelm our backend. Be kind to
            your fellow users (though the app is single-player, so this is mostly about being kind
            to yourself).
          </p>
        </section>

        <section className="card">
          <h2>Trademarks</h2>
          <p>
            MLB, team names, and streaming service brands are property of their respective owners.
            sports-watch is not affiliated with Major League Baseball.
          </p>
        </section>
      </article>
    </main>
  );
}
