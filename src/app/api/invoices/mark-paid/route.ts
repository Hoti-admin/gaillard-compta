import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const invoiceId = body?.invoiceId as string | undefined;
  const discountRateBp = Number(body?.discountRateBp ?? 0);
  const method = (body?.method ?? null) as string | null;
  const reference = (body?.reference ?? null) as string | null;

  if (!invoiceId) return new NextResponse("Missing invoiceId", { status: 400 });

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, amountGrossCents: true, status: true },
  });

  if (!invoice) return new NextResponse("Not found", { status: 404 });
  if (invoice.status === "CANCELED") return new NextResponse("Invoice canceled", { status: 400 });

  const bp = Math.max(0, Math.min(10000, Math.trunc(discountRateBp))); // 0..10000
  const discountCents = Math.round((invoice.amountGrossCents * bp) / 10000);
  const paidAmountCents = invoice.amountGrossCents - discountCents;

  const now = new Date();

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: now,
        discountRateBp: bp || null,
        discountCents: bp ? discountCents : null,
        paidAmountCents,
      },
    }),
    prisma.payment.create({
      data: {
        invoiceId,
        date: now,
        amountCents: paidAmountCents,
        method,
        reference,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
