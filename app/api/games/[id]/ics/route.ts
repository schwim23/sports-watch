import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function fmt(d: Date) {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await prisma.game.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!g) return NextResponse.json({ error: "not found" }, { status: 404 });
  const start = new Date(g.startsAt);
  const end = new Date(start.getTime() + 1000 * 60 * 60 * 3.5);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//sports-watch//EN",
    "BEGIN:VEVENT",
    `UID:${g.id}@sports-watch`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation}`,
    `LOCATION:${g.venueName ?? ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="game-${g.id}.ics"`,
    },
  });
}
