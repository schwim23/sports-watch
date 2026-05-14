import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { zip: true, _count: { select: { follows: true } } },
  });

  const needsOnboarding = !user?.zip || user._count.follows === 0;
  return (
    <>
      <header>
        <div className="container" style={{ padding: 0 }}>
          <nav className="row" style={{ justifyContent: "space-between" }}>
            <Link href="/home" className="brand" aria-label="sports-watch home">
              <span className="brand-mark" aria-hidden />
              <span>SPORTS·WATCH</span>
            </Link>
            <div className="row" style={{ gap: "1.1rem" }}>
              <Link href="/home">Today</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/services">Services</Link>
              <Link href="/settings">Settings</Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button className="secondary" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      </header>
      <main className="container">
        {needsOnboarding ? (
          <div className="card" style={{ borderColor: "var(--mlb-red)", borderLeftWidth: 4 }}>
            <p style={{ margin: 0 }}>
              <strong style={{ letterSpacing: "0.04em" }}>Finish setup</strong> to see your games.{" "}
              <Link href="/onboarding">Continue onboarding →</Link>
            </p>
          </div>
        ) : null}
        {children}
      </main>
      <footer
        className="container"
        style={{ paddingTop: "2rem", paddingBottom: "2rem", textAlign: "center" }}
      >
        <p>
          <Link href="/privacy">Privacy</Link> &nbsp;·&nbsp; <Link href="/terms">Terms</Link>
        </p>
      </footer>
    </>
  );
}
