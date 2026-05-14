import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import PushToggle from "@/components/PushToggle";
import NotificationPrefs from "@/components/NotificationPrefs";
import ZipEditor from "@/components/ZipEditor";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      zip: true,
      quietStart: true,
      quietEnd: true,
      timezone: true,
      _count: { select: { follows: true, subscriptions: true } },
      pushSubscriptions: { select: { id: true } },
    },
  });
  if (!me) redirect("/login");

  return (
    <>
      <h1>Settings</h1>

      <div className="card">
        <h2>Account</h2>
        <p className="muted" style={{ marginTop: 0 }}>{me.email}</p>
        <ZipEditor initialZip={me.zip ?? ""} />
      </div>

      <div className="card">
        <h2>Your setup</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {me._count.follows} team{me._count.follows === 1 ? "" : "s"} ·{" "}
          {me._count.subscriptions} service{me._count.subscriptions === 1 ? "" : "s"}
        </p>
        <div className="row" style={{ gap: "0.85rem", marginTop: "0.4rem" }}>
          <Link href="/teams">Manage teams →</Link>
          <Link href="/services">Manage services →</Link>
        </div>
      </div>

      <div className="card">
        <h2>Notifications</h2>
        <PushToggle hasSubscription={me.pushSubscriptions.length > 0} />
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.6rem" }}>
          To mute a specific team, go to <Link href="/teams">My teams</Link> and tap Mute.
        </p>
      </div>

      <div className="card">
        <h2>Quiet hours</h2>
        <NotificationPrefs
          initialQuietStart={me.quietStart}
          initialQuietEnd={me.quietEnd}
          initialTimezone={me.timezone}
        />
      </div>
    </>
  );
}
