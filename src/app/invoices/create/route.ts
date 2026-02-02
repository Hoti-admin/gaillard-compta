// src/app/invoices/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMoneyToCents, parseVatRateToBp } from "@/lib/money";

function centsToParts(grossCents: number, vatRateBp: number) {
  // net = gross / (1 + vat)
  const denom = 10000 + vatRateBp;
  const net = Math.round((grossCents * 10000) / denom);
  const vat = grossCents - net;
  return { netCents: net, vatCents: vat };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clientId = String(body.clientId || "");
    const number = String(body.number || "").trim();
    const issueDate = new Date(body.issueDate);
    const dueDate = new Date(body.dueDate);

    const projectName = body.projectName ? String(body.projectName).trim() : null;

    if (!clientId) {
      return NextResponse.json({ error: "Client manquant." }, { status: 400 });
    }
    if (!number) {
      return NextResponse.json({ error: "Numéro de facture manquant." }, { status: 400 });
    }
    if (isNaN(issueDate.getTime()) || isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
    }

    // ✅ TTC robuste (virgule/point/apostrophe)
    const grossCents = parseMoneyToCents(body.amountGross);
    if (grossCents == null || grossCents <= 0) {
      return NextResponse.json(
        { error: "Montant TTC invalide. Exemple: 10695.50 ou 10'695,50" },
        { status: 400 }
      );
    }

    // ✅ TVA par défaut: 8.1%
    const vatRateBp = parseVatRateToBp(body.vatRateBp ?? body.vatRate, 810);

    const { netCents, vatCents } = centsToParts(grossCents, vatRateBp);

    const created = await prisma.invoice.create({
      data: {
        clientId,
        number,
        issueDate,
        dueDate,
        projectName: projectName || null,
        vatRateBp,
        amountGrossCents: grossCents,
        amountNetCents: netCents,
        amountVatCents: vatCents,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
