import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const payments = await prisma.payment.findMany({
    orderBy: { date: "desc" },
    include: { invoice: { include: { client: true } } },
  });
  return NextResponse.json({ ok: true, payments });
}
