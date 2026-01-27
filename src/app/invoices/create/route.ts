import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";

export const runtime = "nodejs";

function parseDateOrNull(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseInvoiceStatus(v: any): InvoiceStatus {
  const s = String(v ?? "").toUpperCase().trim();

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

    // Dates
    const issueDate = parseDateOrNull(body?.issueDate) ?? new Date(); // obligatoire
    const dueDate = parseDateOrNull(body?.dueDate); // optionnel

    // Status enum
    const status = parseInvoiceStatus(body?.status);

    // Note
    const note = body?.note ? String(body.note) : null;

    // ✅ IMPORTANT:
    // On n'écrit PLUS totalTtc / totalHt / totalTva / tvaRate
    // car ils n'existent pas dans ton modèle Prisma Invoice.
    const created = await prisma.invoice.create({
      data: {
        supplierId,
        number,
        issueDate,
        ...(dueDate ? { dueDate } : {}),
        status,
        note,
      },
    });

    return NextResponse.json({ ok: true, invoice: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Erreur création facture" },
      { status: 500 }
    );
  }
}
