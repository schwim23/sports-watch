import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ServicesManager from "@/components/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptions: { select: { service: true } } },
  });
  if (!me) redirect("/login");

  const initialSubs = me.subscriptions.map((s) => s.service);

  return (
    <>
      <h1>My services</h1>
      <p className="muted" style={{ marginBottom: "1rem" }}>
        Tap any service you pay for. We&apos;ll only surface streaming options you can actually
        watch — and prioritize them on each game card.
      </p>
      <ServicesManager initialSubs={initialSubs} />
    </>
  );
}
