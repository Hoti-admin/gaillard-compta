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
  customPaidCents?: number;
}) {
  const inv = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      status: true,
      amountGrossCents: true, // ✅ TTC en centimes
    },
  });

  if (!inv) throw new Error("Facture introuvable");

  const gross = inv.amountGrossCents;

  let paidAmountCents = gross;
  let discountRateBp: number | null = null;
  let discountCents: number | null = null;

  if (input.mode === "DISCOUNT") {
    const rate = Number(input.discountRateBp ?? 0);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Taux d’escompte invalide");

    discountRateBp = rate;
    discountCents = roundCents((gross * rate) / 10000);
    paidAmountCents = gross - discountCents;
  }

  if (input.mode === "CUSTOM") {
    const custom = Number(input.customPaidCents ?? NaN);
    if (!Number.isFinite(custom) || custom < 0) throw new Error("Montant payé invalide");

    paidAmountCents = roundCents(custom);

    // on calcule la différence comme "discount" (si tu veux)
    discountRateBp = null;
    discountCents = gross - paidAmountCents;
    if (discountCents < 0) discountCents = 0;
  }

  await prisma.invoice.update({
    where: { id: inv.id },
    data: {
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
      paidAmountCents,
      discountRateBp,
      discountCents,
    },
  });

  // important : refresh la page /invoices
  revalidatePath("/invoices");
}
