import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { StreamingService } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscriptions: true, follows: { include: { team: true } } },
  });
  return NextResponse.json({ user });
}

const patchSchema = z.object({
  zip: z.string().regex(/^\d{5}$/).optional(),
  subscriptions: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  if (parsed.data.zip) {
    await prisma.user.update({ where: { id: session.user.id }, data: { zip: parsed.data.zip } });
  }
  if (parsed.data.subscriptions) {
    await prisma.userSubscription.deleteMany({ where: { userId: session.user.id } });
    await prisma.userSubscription.createMany({
      data: parsed.data.subscriptions.map((s) => ({
        userId: session.user.id,
        service: s as StreamingService,
      })),
      skipDuplicates: true,
    });
  }
  return NextResponse.json({ ok: true });
}
