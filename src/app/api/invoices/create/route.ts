import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  clientId: string;

  // Optionnel (si tu veux forcer un numéro). Sinon auto.
  number?: string | null;

  // "YYYY-MM-DD"
  issueDate: string;
  dueDate: string;

  // Montant TTC en CHF (ex: 1799.85)
  totalTtc: number;

  // TVA en % (ex: 8.1). Si absent => 8.1
  vatRate?: number;

  notes?: string | null;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function parseSeqFromNumber(num: string, year: number) {
  // attend "2026-001"
  const prefix = `${year}-`;
  if (!num.startsWith(prefix)) return null;
  const tail = num.slice(prefix.length);
  const seq = Number(tail);
  if (!Number.isFinite(seq)) return null;
  return seq;
}

async function nextInvoiceNumber(tx: typeof prisma, year: number) {
  // prend le plus grand "YYYY-xxx"
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: `${year}-` } },
    orderBy: { number: "desc" }, // marche bien grâce au padding 001/002/...
    select: { number: true },
  });

  const lastSeq = last?.number ? parseSeqFromNumber(last.number, year) : null;
  const nextSeq = (lastSeq ?? 0) + 1;
  return `${year}-${pad3(nextSeq)}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body.clientId) {
      return NextResponse.json({ error: "clientId manquant" }, { status: 400 });
    }
    if (!body.issueDate || !body.dueDate) {
      return NextResponse.json({ error: "Dates manquantes" }, { status: 400 });
    }
    if (typeof body.totalTtc !== "number" || body.totalTtc <= 0) {
      return NextResponse.json({ error: "Montant TTC invalide" }, { status: 400 });
    }

    const issueDate = new Date(`${body.issueDate}T00:00:00.000Z`);
    const dueDate = new Date(`${body.dueDate}T00:00:00.000Z`);
    const year = issueDate.getUTCFullYear();

    const vatRate = typeof body.vatRate === "number" ? body.vatRate : 8.1;
    if (vatRate < 0 || vatRate > 100) {
      return NextResponse.json({ error: "TVA invalide" }, { status: 400 });
    }

    // TVA en basis points (8.1% => 810)
    const vatRateBp = Math.round(vatRate * 100);

    // calcul HT/TVA à partir du TTC
    const gross = Number(body.totalTtc);
    const net = vatRate > 0 ? gross / (1 + vatRate / 100) : gross;
    const vat = gross - net;

    const amountGrossCents = Math.round(gross * 100); // TTC
    const amountNetCents = Math.round(net * 100);     // HT
    const amountVatCents = Math.round(vat * 100);     // TVA

    const invoice = await prisma.$transaction(async (tx) => {
      // numéro: si fourni => on le prend, sinon auto
      const number =
        body.number && String(body.number).trim().length > 0
          ? String(body.number).trim()
          : await nextInvoiceNumber(tx as any, year);

      // création
      return tx.invoice.create({
        data: {
          clientId: body.clientId,
          number,
          issueDate,
          dueDate,
          vatRateBp,
          amountGrossCents,
          amountNetCents,
          amountVatCents,
          notes: body.notes ?? null,
          status: "OPEN" as any,
        },
        select: { id: true, number: true, clientId: true },
      });
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (e: any) {
    // si collision unique sur number, Prisma renvoie une erreur -> on la renvoie proprement
    return NextResponse.json(
      { error: e?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
