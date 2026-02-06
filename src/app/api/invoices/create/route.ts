import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      clientId,
      number,
      project,
      issueDate,
      dueDate,
      vatRateBp,
      amountGross, // ⚠️ float depuis le form (ex: 482.65)
    } = body;

    // -------------------------
    // ✅ conversions SAFE
    // -------------------------
    const grossCents = Math.round(Number(amountGross) * 100);

    if (!Number.isFinite(grossCents) || grossCents <= 0) {
      return NextResponse.json(
        { error: "Montant TTC invalide" },
        { status: 400 }
      );
    }

    const vatBp = Number(vatRateBp ?? 0); // ex: 810
    const vatCents = Math.round((grossCents * vatBp) / (10000 + vatBp));
    const netCents = grossCents - vatCents;

    // -------------------------
    // ✅ création facture
    // -------------------------
    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        number,
        project: project || null,
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
