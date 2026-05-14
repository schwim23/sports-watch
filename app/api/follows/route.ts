import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const follows = await prisma.teamFollow.findMany({
    where: { userId: session.user.id },
    include: { team: true },
  });
  return NextResponse.json({ follows });
}

const postSchema = z.object({ teamId: z.string() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await prisma.teamFollow.upsert({
    where: { userId_teamId: { userId: session.user.id, teamId: parsed.data.teamId } },
    create: { userId: session.user.id, teamId: parsed.data.teamId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  teamId: z.string(),
  notifyMuted: z.boolean(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await prisma.teamFollow.update({
    where: { userId_teamId: { userId: session.user.id, teamId: parsed.data.teamId } },
    data: { notifyMuted: parsed.data.notifyMuted },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { teamId } = await req.json();
  await prisma.teamFollow.deleteMany({ where: { userId: session.user.id, teamId } });
  return NextResponse.json({ ok: true });
}
