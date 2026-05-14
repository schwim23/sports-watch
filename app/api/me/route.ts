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
  zip: z
    .string()
    .regex(/^\d{5}$/)
    .refine((z) => {
      const n = Number(z);
      return n >= 501 && n <= 99950;
    }, "ZIP must be a valid US ZIP code")
    .optional(),
  subscriptions: z.array(z.string()).optional(),
  quietStart: z.number().int().min(0).max(23).nullable().optional(),
  quietEnd: z.number().int().min(0).max(23).nullable().optional(),
  timezone: z.string().min(1).max(64).nullable().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const updateData: {
    zip?: string;
    quietStart?: number | null;
    quietEnd?: number | null;
    timezone?: string | null;
  } = {};
  if (parsed.data.zip !== undefined) updateData.zip = parsed.data.zip;
  if (parsed.data.quietStart !== undefined) updateData.quietStart = parsed.data.quietStart;
  if (parsed.data.quietEnd !== undefined) updateData.quietEnd = parsed.data.quietEnd;
  if (parsed.data.timezone !== undefined) updateData.timezone = parsed.data.timezone;

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({ where: { id: session.user.id }, data: updateData });
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
