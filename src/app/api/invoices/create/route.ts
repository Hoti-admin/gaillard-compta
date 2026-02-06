import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clientId,
      number,
      // project, // ❌ on ne l'utilise pas tant que la DB n'a pas le champ
      issueDate,
      dueDate,
      vatRateBp,
      amountGross, // ex: 482.65
    } = body;

    // ✅ conversions SAFE
    const grossCents = Math.round(Number(amountGross) * 100);

    if (!Number.isFinite(grossCents) || grossCents <= 0) {
      return NextResponse.json({ error: "Montant TTC invalide" }, { status: 400 });
    }

    const vatBp = Number(vatRateBp ?? 0); // ex: 810
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
    return NextResponse.json({ error: "Erreur serveur création facture" }, { status: 500 });
  }
}
