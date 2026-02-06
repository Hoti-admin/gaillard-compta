import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function parseMoneyToCents(input: unknown): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }

  if (typeof input === "string") {
    let s = input.trim();

    // enlève CHF, espaces, etc.
    s = s.replace(/chf/gi, "").trim();

    // enlève espaces et séparateurs de milliers (espace, apostrophe)
    s = s.replace(/\s+/g, "").replace(/'/g, "");

    // transforme virgule en point
    s = s.replace(",", ".");

    // garde uniquement chiffres + point + signe
    s = s.replace(/[^0-9.-]/g, "");

    const n = Number(s);
    if (!Number.isFinite(n)) return null;

    return Math.round(n * 100);
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clientId,
      number,
      issueDate,
      dueDate,
      vatRateBp,     // ex: 810
      amountGross,   // ex: "482,65" ou 482.65
    } = body;

    const grossCents = parseMoneyToCents(amountGross);

    if (!grossCents || grossCents <= 0) {
      return NextResponse.json(
        { error: "Montant TTC invalide", received: amountGross },
        { status: 400 }
      );
    }

    const vatBp = Number(vatRateBp ?? 0);
    if (!Number.isFinite(vatBp) || vatBp < 0 || vatBp > 5000) {
      return NextResponse.json({ error: "TVA invalide" }, { status: 400 });
    }

    // TVA incluse: TVA = TTC * taux / (100% + taux)
    const vatCents = Math.round((grossCents * vatBp) / (10000 + vatBp));
    const netCents = grossCents - vatCents;

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        number,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),

        amountGrossCents: grossCents,
        amountNetCents: netCents,
        amountVatCents: vatCents,
        vatRateBp: vatBp,

        status: "OPEN",
      },
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    console.error("CREATE INVOICE ERROR", err);
    return NextResponse.json(
      { error: "Erreur serveur création facture" },
      { status: 500 }
    );
  }
}
