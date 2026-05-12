import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [teams, me] = await Promise.all([
    prisma.team.findMany({
      where: { sport: "MLB" },
      orderBy: [{ city: "asc" }],
      select: { id: true, name: true, city: true, abbreviation: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscriptions: true, follows: true },
    }),
  ]);

  return (
    <>
      <h1>Set up your account</h1>
      <OnboardingForm
        teams={teams}
        initialZip={me?.zip ?? ""}
        initialSubs={me?.subscriptions.map((s) => s.service) ?? []}
        initialFollows={me?.follows.map((f) => f.teamId) ?? []}
      />
    </>
  );
}
