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
      <header className="container" style={{ paddingTop: "1rem", paddingBottom: 0 }}>
        <nav className="row" style={{ justifyContent: "space-between" }}>
          <Link href="/home"><strong>sports-watch</strong></Link>
          <div className="row">
            <Link href="/settings">Settings</Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="secondary" type="submit">Sign out</button>
            </form>
          </div>
        </nav>
      </header>
      <main className="container">
        {needsOnboarding ? (
          <div className="card">
            <p>Finish setup to see your games. <Link href="/onboarding">Continue onboarding →</Link></p>
          </div>
        ) : null}
        {children}
      </main>
    </>
  );
}
