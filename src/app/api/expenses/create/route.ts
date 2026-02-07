import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const date = new Date(body.date);
    const vendor = String(body.vendor ?? "").trim();
    const category = String(body.category ?? "").trim();

    const vatRateBp = Number(body.vatRateBp ?? 810);
    const amountGrossCents = Number(body.amountGrossCents ?? 0);
    const amountNetCents = Number(body.amountNetCents ?? 0);
    const amountVatCents = Number(body.amountVatCents ?? 0);
    const notes = body.notes ? String(body.notes) : null;

    if (!vendor) {
      return NextResponse.json({ error: "Fournisseur (vendor) manquant" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Catégorie manquante" }, { status: 400 });
    }
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }

    const exp = await prisma.expense.create({
      data: {
        date,
        vendor,
        category, // la DB actuelle a category en TEXT
        vatRateBp,
        amountGrossCents,
        amountNetCents,
        amountVatCents,
        notes,
        // ✅ IMPORTANT : PAS de receiptPath ici
      },
    });

    return NextResponse.json({ ok: true, expense: exp });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
