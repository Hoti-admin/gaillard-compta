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
  const allowed: InvoiceStatus[] = [InvoiceStatus.OPEN, InvoiceStatus.PAID, InvoiceStatus.CANCELED];
  return allowed.includes(s as InvoiceStatus) ? (s as InvoiceStatus) : InvoiceStatus.OPEN;
}

// "120.50" -> 12050
function toCents(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);

  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ facture client: clientId
    // fallback si tu envoies encore supplierId côté front
    const clientId = String(body?.clientId ?? body?.supplierId ?? "").trim();
    if (!clientId) {
      return NextResponse.json({ error: "clientId manquant" }, { status: 400 });
    }

    const number = String(body?.number ?? "").trim();
    if (!number) {
      return NextResponse.json({ error: "number manquant" }, { status: 400 });
    }

    const issueDate = parseDateOrNull(body?.issueDate) ?? new Date();
    const dueDate = parseDateOrNull(body?.dueDate);

    const status = parseInvoiceStatus(body?.status);

    // ✅ Prisma: "notes" (pas "note")
    const notes =
      body?.notes != null ? String(body.notes) :
      body?.note != null ? String(body.note) :
      undefined;

    // ✅ Champs requis par Prisma
    const amountGrossCents =
      body?.amountGrossCents != null ? toCents(body.amountGrossCents) :
      body?.amountGross != null ? toCents(body.amountGross) :
      body?.totalTtc != null ? toCents(body.totalTtc) :
      0;

    const amountNetCents =
      body?.amountNetCents != null ? toCents(body.amountNetCents) :
      body?.amountNet != null ? toCents(body.amountNet) :
      body?.totalHt != null ? toCents(body.totalHt) :
      body?.totalHT != null ? toCents(body.totalHT) :
      0;

    let amountVatCents =
      body?.amountVatCents != null ? toCents(body.amountVatCents) :
      body?.amountVat != null ? toCents(body.amountVat) :
      body?.totalTva != null ? toCents(body.totalTva) :
      0;

    // calc TVA si manquante mais TTC & HT présents
    if (amountVatCents === 0 && amountGrossCents > 0 && amountNetCents > 0) {
      amountVatCents = Math.max(0, amountGrossCents - amountNetCents);
    }

    const created = await prisma.invoice.create({
      data: {
        clientId,
        number,
        issueDate,
        ...(dueDate ? { dueDate } : {}),
        status,
        ...(notes ? { notes } : {}),
        amountGrossCents,
        amountNetCents,
        amountVatCents,
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
