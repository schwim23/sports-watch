import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import TeamsManager from "@/components/TeamsManager";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [teams, me] = await Promise.all([
    prisma.team.findMany({
      where: { sport: "MLB" },
      orderBy: [{ city: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        abbreviation: true,
        externalId: true,
        logoUrl: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        zip: true,
        follows: { select: { teamId: true, notifyMuted: true } },
      },
    }),
  ]);

  if (!me) redirect("/login");

  return (
    <>
      <h1>My teams</h1>
      <p className="muted" style={{ marginBottom: "0.5rem" }}>
        Follow teams to see their games on{" "}
        <Link href="/home" style={{ borderBottom: 0 }}>
          Today
        </Link>
        . Toggle Mute to keep a team in your schedule without notifications.
      </p>
      {!me.zip ? (
        <div className="card" style={{ borderColor: "var(--mlb-red)", borderLeftWidth: 4 }}>
          <p style={{ margin: 0 }}>
            <strong>Set your ZIP</strong> in{" "}
            <Link href="/settings">Settings</Link> so we can tag teams in your local market.
          </p>
        </div>
      ) : null}
      <TeamsManager teams={teams} initialFollows={me.follows} userZip={me.zip} />
    </>
  );
}
