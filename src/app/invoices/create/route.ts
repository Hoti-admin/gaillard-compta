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
    InvoiceStatus.CANCELED, // ✅ (pas CANCELLED)
  ];

  return allowed.includes(s as InvoiceStatus) ? (s as InvoiceStatus) : InvoiceStatus.OPEN;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Invoice = facture CLIENT
    // On accepte clientId (normal) OU supplierId (si ton front n'est pas encore corrigé)
    const clientId = String(body?.clientId ?? body?.supplierId ?? "").trim();
    if (!clientId) {
      return NextResponse.json({ error: "clientId manquant" }, { status: 400 });
    }

    const number = String(body?.number ?? "").trim();
    if (!number) {
      return NextResponse.json({ error: "number manquant" }, { status: 400 });
    }

    const issueDate = parseDateOrNull(body?.issueDate) ?? new Date(); // obligatoire
    const dueDate = parseDateOrNull(body?.dueDate); // optionnel

    const status = parseInvoiceStatus(body?.status);

    // ✅ Prisma: champ = "notes" (pas "note")
    const notes =
      body?.notes != null ? String(body.notes) :
      body?.note != null ? String(body.note) :
      null;

    const created = await prisma.invoice.create({
      data: {
        // ✅ SI ton modèle Invoice a bien clientId
        clientId,

        number,
        issueDate,
        ...(dueDate ? { dueDate } : {}),
        status,
        ...(notes ? { notes } : {}),
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
