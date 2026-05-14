import { PrismaClient } from "@prisma/client";
import blackouts from "../data/blackouts.json" with { type: "json" };
import teamsData from "../data/mlb-teams.json" with { type: "json" };

const prisma = new PrismaClient();

type RsnSeed = { id: string; name: string; teams: string[]; zip3: string[] };
type TeamSeed = {
  externalId: string;
  abbreviation: string;
  name: string;
  city: string;
  primaryRsn: string;
};

async function main() {
  console.log("Seeding RSNs…");
  const rsnByExtId = new Map<string, string>();
  for (const r of (blackouts as { rsns: RsnSeed[] }).rsns) {
    const created = await prisma.rsn.upsert({
      where: { name: r.name },
      create: { name: r.name, shortName: r.id, marketZips: r.zip3 },
      update: { marketZips: r.zip3 },
    });
    rsnByExtId.set(r.id, created.id);
  }

  console.log("Seeding teams…");
  for (const t of (teamsData as { teams: TeamSeed[] }).teams) {
    await prisma.team.upsert({
      where: { externalId: t.externalId },
      create: {
        externalId: t.externalId,
        sport: "MLB",
        name: t.name,
        abbreviation: t.abbreviation,
        city: t.city,
        primaryRsnId: rsnByExtId.get(t.primaryRsn) ?? null,
      },
      update: {
        name: t.name,
        abbreviation: t.abbreviation,
        city: t.city,
        primaryRsnId: rsnByExtId.get(t.primaryRsn) ?? null,
      },
    });
  }

  console.log("Done.");
}

main().finally(() => prisma.$disconnect());
