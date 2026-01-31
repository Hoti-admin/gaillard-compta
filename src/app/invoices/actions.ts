"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { InvoiceStatus } from "@prisma/client";

function roundCents(n: number) {
  return Math.round(n);
}

export async function markInvoicePaid(input: {
  invoiceId: string;
  mode: "FULL" | "DISCOUNT" | "CUSTOM";
  discountRateBp?: number; // ex: 200 = 2.00%
  customPaidCents?: number; // montant TTC payé en centimes
}) {
  const inv = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      status: true,
      amountGrossCents: true, // TTC en centimes
    },
  });

  if (!inv) throw new Error("Facture introuvable");

  // (optionnel) si déjà payée, on ne refait pas
  if (inv.status === InvoiceStatus.PAID) {
    revalidatePath("/invoices", "page");
    return;
  }

  const gross = Number(inv.amountGrossCents);
  if (!Number.isFinite(gross) || gross < 0) throw new Error("Montant TTC invalide");

  let paidAmountCents = gross;
  let discountRateBp: number | null = null;
  let discountCents: number | null = null;

  if (input.mode === "DISCOUNT") {
    const rate = Number(input.discountRateBp ?? 0);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Taux d’escompte invalide");

    discountRateBp = roundCents(rate);
    discountCents = roundCents((gross * discountRateBp) / 10000);

    // sécurité: pas de montant négatif
    if (discountCents > gross) discountCents = gross;

    paidAmountCents = gross - discountCents;
  }

  if (input.mode === "CUSTOM") {
    const custom = Number(input.customPaidCents ?? NaN);
    if (!Number.isFinite(custom) || custom < 0) throw new Error("Montant payé invalide");

    paidAmountCents = roundCents(custom);

    // clamp (tu peux autoriser > gross si tu veux, mais généralement non)
    if (paidAmountCents > gross) paidAmountCents = gross;

    // on met la différence comme "discount"
    discountRateBp = null;
    discountCents = gross - paidAmountCents;
    if (discountCents < 0) discountCents = 0;
  }

  await prisma.invoice.update({
    where: { id: inv.id },
    data: {
      status: InvoiceStatus.PAID,

      // ⚠️ ces champs doivent exister dans le modèle Invoice
      paidAt: new Date(),
      paidAmountCents,
      discountRateBp,
      discountCents,
    },
  });

  revalidatePath("/invoices", "page");
}
