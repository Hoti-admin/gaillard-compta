import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toDate(value: string) {
  const d = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) throw new Error("Date invalide");
  return d;
}

function toNumber(value: string) {
  const n = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error("Nombre invalide");
  return n;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clientId = String(body.clientId || "").trim();
    const number = String(body.number || "").trim();
    const issueDateStr = String(body.issueDate || "").trim();
    const dueDateStr = String(body.dueDate || "").trim();
    const totalTtcStr = String(body.totalTtc || "").trim();
    const tvaRateStr = String(body.tvaRate ?? "0").trim();

    if (!clientId) throw new Error("clientId manquant");
    if (!number) throw new Error("Numéro de facture manquant");
    if (!issueDateStr) throw new Error("Date de facturation manquante");
    if (!totalTtcStr) throw new Error("Montant TTC manquant");

    const issueDate = toDate(issueDateStr);
    const dueDate = dueDateStr ? toDate(dueDateStr) : null;

    const totalTtc = toNumber(totalTtcStr);
    const tvaRate = toNumber(tvaRateStr);

    if (totalTtc <= 0) throw new Error("Montant TTC invalide");
    if (tvaRate < 0) throw new Error("TVA invalide");

    const ht = tvaRate > 0 ? totalTtc / (1 + tvaRate / 100) : totalTtc;
    const tva = totalTtc - ht;

    const amountGrossCents = Math.round(totalTtc * 100);

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        number,
        issueDate,
        dueDate: dueDate ?? undefined,
        totalTtc: round2(totalTtc) as any,
        tvaRate: round2(tvaRate) as any,
        totalHt: round2(ht) as any,
        totalTva: round2(tva) as any,
        amountGrossCents,
      },
    });

    return NextResponse.json({ ok: true, invoiceId: invoice.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur inconnue" },
      { status: 400 }
    );
  }
}
