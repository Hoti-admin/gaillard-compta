import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const invoiceId = String(body?.invoiceId ?? "").trim();
  if (!invoiceId) return new NextResponse("Missing invoiceId", { status: 400 });

  const paidAtStr = String(body?.paidAt ?? "").trim();
  const paidAt = paidAtStr ? new Date(paidAtStr) : new Date();

  const paidAmountCents = Number(body?.paidAmountCents);
  if (!Number.isFinite(paidAmountCents) || paidAmountCents < 0) {
    return new NextResponse("Invalid paidAmountCents", { status: 400 });
  }

  const discountRateBp =
    body?.discountRateBp === null || body?.discountRateBp === undefined
      ? null
      : Number(body.discountRateBp);

  const discountCents =
    body?.discountCents === null || body?.discountCents === undefined
      ? null
      : Number(body.discountCents);

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt,
      paidAmountCents,
      discountRateBp: discountRateBp ?? null,
      discountCents: discountCents ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
