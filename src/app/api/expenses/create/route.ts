import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toInt(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function consideredVat(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 8.1;
  if (n < 0) return 0;
  if (n > 100) return 8.1;
  return n;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const dateStr = String(body.date || "");
    const vendor = String(body.vendor || "").trim();
    const category = String(body.category || "DIVERS");

    // ✅ FIX ICI
    const vatRate = consideredVat(body.vatRateBp ?? body.vatRate ?? 8.1);

    const amountGrossCents = toInt(body.amountGrossCents ?? 0);
    const notes = body.notes ? String(body.notes) : null;
    const receiptPath = body.receiptPath ? String(body.receiptPath) : null;

    if (!dateStr) return NextResponse.json({ error: "Date obligatoire" }, { status: 400 });
    if (!vendor) return NextResponse.json({ error: "Libellé obligatoire" }, { status: 400 });
    if (!amountGrossCents || amountGrossCents <= 0)
      return NextResponse.json({ error: "Montant TTC invalide" }, { status: 400 });

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime()))
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });

    // 8.1 -> 810 (basis points)
    const vatRateBp = Math.round(Number(vatRate) * 100);

    const gross = amountGrossCents;
    const net = vatRateBp > 0 ? Math.round(gross / (1 + vatRateBp / 10000)) : gross;
    const vat = gross - net;

    const expense = await prisma.expense.create({
      data: {
        date,
        vendor,
        category: category as any,
        vatRateBp,
        amountGrossCents: gross,
        amountNetCents: net,
        amountVatCents: vat,
        notes,
        receiptPath,
      },
    });

    return NextResponse.json({ ok: true, expense });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur serveur" }, { status: 500 });
  }
}
