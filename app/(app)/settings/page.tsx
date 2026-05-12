import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import PushToggle from "@/components/PushToggle";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscriptions: true, follows: { include: { team: true } }, pushSubscriptions: true },
  });
  if (!me) redirect("/login");

  return (
    <>
      <h1>Settings</h1>
      <div className="card">
        <h2>Account</h2>
        <p className="muted">{me.email}</p>
        <p>Home ZIP: <strong>{me.zip ?? "not set"}</strong></p>
        <Link href="/onboarding">Edit preferences</Link>
      </div>
      <div className="card">
        <h2>Streaming subscriptions</h2>
        {me.subscriptions.length === 0 ? <p className="muted">None set.</p> : (
          <ul>{me.subscriptions.map((s) => <li key={s.id}>{s.service}</li>)}</ul>
        )}
      </div>
      <div className="card">
        <h2>Followed teams</h2>
        {me.follows.length === 0 ? <p className="muted">None.</p> : (
          <ul>{me.follows.map((f) => <li key={f.id}>{f.team.city} {f.team.name}</li>)}</ul>
        )}
      </div>
      <div className="card">
        <h2>Notifications</h2>
        <PushToggle hasSubscription={me.pushSubscriptions.length > 0} />
      </div>
    </>
  );
}
