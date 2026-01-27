import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";

export const runtime = "nodejs";

function round2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function parseNumber(v: any, def = 0) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
}

function parseDateOrNull(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseInvoiceStatus(v: any): InvoiceStatus {
  const s = String(v ?? "").toUpperCase().trim();

  // ✅ valeurs existantes dans ton enum Prisma
  const allowed: InvoiceStatus[] = [
    InvoiceStatus.OPEN,
    InvoiceStatus.PAID,
    InvoiceStatus.CANCELED,
  ];

  return allowed.includes(s as InvoiceStatus) ? (s as InvoiceStatus) : InvoiceStatus.OPEN;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const supplierId = String(body?.supplierId ?? "").trim();
    if (!supplierId) {
      return NextResponse.json({ error: "supplierId manquant" }, { status: 400 });
    }

    const number = String(body?.number ?? "").trim();
    if (!number) {
      return NextResponse.json({ error: "number manquant" }, { status: 400 });
    }

    const issueDate = parseDateOrNull(body?.issueDate) ?? new Date(); // obligatoire
    const dueDate = parseDateOrNull(body?.dueDate); // optionnel

    const totalTtc = parseNumber(body?.totalTtc, 0);
    const tvaRate = parseNumber(body?.tvaRate, 0);

    const ht = tvaRate > 0 ? totalTtc / (1 + tvaRate / 100) : totalTtc;
    const tva = totalTtc - ht;

    const status = parseInvoiceStatus(body?.status);

    const created = await prisma.invoice.create({
      data: {
        supplierId,
        number,
        issueDate,
        ...(dueDate ? { dueDate } : {}), // ✅ pas de undefined
        totalTtc: round2(totalTtc) as any,
        tvaRate: round2(tvaRate) as any,
        totalHt: round2(ht) as any,
        totalTva: round2(tva) as any,
        status, // ✅ enum Prisma
        note: body?.note ? String(body.note) : null,
      },
    });

    return NextResponse.json({ ok: true, invoice: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur création facture" }, { status: 500 });
  }
}
