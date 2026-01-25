import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  invoiceId: string;
  amountCents?: number; // si absent => on paie le solde restant
  date?: string; // "YYYY-MM-DD"
  method?: string;
  reference?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body.invoiceId) {
      return NextResponse.json({ error: "invoiceId manquant" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: body.invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    const alreadyPaid = invoice.payments.reduce((s, p) => s + p.amountCents, 0);
    const total = invoice.amountGrossCents;
    const remaining = Math.max(0, total - alreadyPaid);

    const amountCents =
      typeof body.amountCents === "number" ? Math.round(body.amountCents) : remaining;

    if (amountCents <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const payDate = body.date ? new Date(`${body.date}T00:00:00.000Z`) : new Date();

    // 1) Créer le paiement
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        date: payDate,
        amountCents,
        method: body.method ?? null,
        reference: body.reference ?? null,
      },
    });

    // 2) Recalcul statut facture
    const newPayments = await prisma.payment.findMany({
      where: { invoiceId: invoice.id },
      select: { amountCents: true },
    });
    const newPaid = newPayments.reduce((s, p) => s + p.amountCents, 0);
    const newRemaining = total - newPaid;

    const newStatus =
      newRemaining <= 0 ? "PAID" : newPaid > 0 ? "PARTIAL" : "OPEN";

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus as any },
    });

    return NextResponse.json({
      ok: true,
      status: newStatus,
      paidCents: newPaid,
      remainingCents: Math.max(0, newRemaining),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
