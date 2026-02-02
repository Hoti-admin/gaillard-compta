"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function toCents(chf: string) {
  // accepte "12", "12.5", "12,50", "10 695,50"
  const cleaned = String(chf)
    .replace(/\s/g, "")
    .replace(/’/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

function bpFromPercent(p: string) {
  // "8.1" => 810
  const cleaned = String(p).replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

function computeVat(amountGrossCents: number, vatRateBp: number) {
  // gross = net + vat
  const rate = vatRateBp / 10000; // 810 => 0.081
  const net = Math.round(amountGrossCents / (1 + rate));
  const vat = amountGrossCents - net;
  return { net, vat };
}

export async function createInvoiceForClient(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const issueDateStr = String(formData.get("issueDate") ?? "");
  const dueDateStr = String(formData.get("dueDate") ?? "");

  const chantier = String(formData.get("siteName") ?? "").trim();
  const ttcStr = String(formData.get("ttc") ?? "");
  const vatPercent = String(formData.get("vat") ?? "8.1");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!clientId) throw new Error("Client manquant");
  if (!number) throw new Error("Numéro de facture manquant");
  if (!issueDateStr) throw new Error("Date facture manquante");
  if (!dueDateStr) throw new Error("Échéance manquante");

  const amountGrossCents = toCents(ttcStr);
  if (!Number.isFinite(amountGrossCents) || amountGrossCents <= 0) {
    throw new Error("Montant TTC invalide");
  }

  const vatRateBp = bpFromPercent(vatPercent);
  if (!Number.isFinite(vatRateBp) || vatRateBp < 0) {
    throw new Error("Taux TVA invalide");
  }

  const { net, vat } = computeVat(amountGrossCents, vatRateBp);

  const finalNotes = [
    chantier ? `Chantier: ${chantier}` : null,
    notes ? notes : null,
  ]
    .filter(Boolean)
    .join("\n");

  await prisma.invoice.create({
    data: {
      clientId,
      number,
      issueDate: new Date(issueDateStr),
      dueDate: new Date(dueDateStr),
      vatRateBp,
      amountGrossCents,
      amountNetCents: net,
      amountVatCents: vat,
      notes: finalNotes || null,
      // status default OPEN dans le schema
    },
  });

  revalidatePath("/clients");
  // si tu as une page /clients/[id], ça aussi :
  revalidatePath(`/clients/${clientId}`);
}
