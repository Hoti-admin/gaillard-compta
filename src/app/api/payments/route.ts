import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  invoiceId: string;
  date?: string; // "YYYY-MM-DD"
  amountCents?: number; // si vide => solde restant
  method?: string; // ex: "Virement"
  reference?: string; // optionnel
};

function toDate(dateStr?: string) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const invoiceId = body.invoiceId?.trim();
    if (!invoiceId) return NextResponse.json({ error: "invoiceId manquant" }, { status: 400 });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

    const paidCents = invoice.payments.reduce((s, p) => s + (p.amountCents ?? 0), 0);
    const totalCents = invoice.amountGrossCents ?? 0;
    const remainingCents = Math.max(0, totalCents - paidCents);

    const amountCents =
      typeof body.amountCents === "number" && Number.isFinite(body.amountCents)
        ? Math.round(body.amountCents)
        : remainingCents;

    if (amountCents <= 0) {
      return NextResponse.json({ error: "Aucun solde à payer (déjà soldée ?)" }, { status: 400 });
    }

    const method = (body.method?.trim() || "Virement").slice(0, 40);
    const reference = body.reference?.trim() ? body.reference.trim().slice(0, 80) : null;
    const date = toDate(body.date);

    // Crée le paiement
    await prisma.payment.create({
      data: {
        invoiceId,
        date,
        amountCents,
        method,
        reference: reference ?? undefined,
      },
    });

    // Recalcul statut
    const after = await prisma.payment.aggregate({
      where: { invoiceId },
      _sum: { amountCents: true },
    });

    const newPaid = after._sum.amountCents ?? 0;
    let status: "OPEN" | "PARTIAL" | "PAID" = "OPEN";
    if (newPaid <= 0) status = "OPEN";
    else if (newPaid < totalCents) status = "PARTIAL";
    else status = "PAID";

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    return NextResponse.json({
      ok: true,
      invoiceId,
      status,
      paidCents: newPaid,
      totalCents,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
