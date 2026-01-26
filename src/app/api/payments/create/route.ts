import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const invoiceId = String(body.invoiceId || "").trim();
    const dateStr = String(body.date || "").trim();
    const method = body.method ? String(body.method) : null;
    const reference = body.reference ? String(body.reference) : null;

    const amountCents = toInt(body.amountCents ?? body.amount ?? 0);

    if (!invoiceId) return NextResponse.json({ error: "invoiceId manquant" }, { status: 400 });
    if (!dateStr) return NextResponse.json({ error: "date manquante" }, { status: 400 });
    if (!amountCents || amountCents <= 0)
      return NextResponse.json({ error: "montant invalide" }, { status: 400 });

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime()))
      return NextResponse.json({ error: "date invalide" }, { status: 400 });

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        date,
        amountCents,
        method,
        reference,
      },
    });

    return NextResponse.json({ ok: true, payment });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
