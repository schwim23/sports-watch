import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const teams = await prisma.team.findMany({
    where: { sport: "MLB" },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: { id: true, name: true, city: true, abbreviation: true, logoUrl: true },
  });
  return NextResponse.json({ teams });
}
