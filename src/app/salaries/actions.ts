"use server";

import { prisma } from "@/lib/prisma";

/**
 * Création d’un salaire
 * → stocké comme Expense
 */
export async function createSalary(fd: FormData) {
  try {
    const employee = String(fd.get("employee") ?? "").trim();
    const type = String(fd.get("type") ?? "");
    const dateStr = String(fd.get("date") ?? "");
    const amountStr = String(fd.get("amount") ?? "").replace(",", ".");

    if (!employee) {
      return { ok: false, error: "Employé manquant" };
    }

    const amount = Math.round(Number(amountStr) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "Montant invalide" };
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { ok: false, error: "Date invalide" };
    }

    const category =
      type === "SALAIRE_CADRE" ? "SALAIRE_CADRE" : "SALAIRE_EMPLOYE";

    await prisma.expense.create({
      data: {
        vendor: employee,              // nom employé
        category,                      // SALAIRE_*
        date,
        amountGrossCents: amount,
        amountNetCents: amount,
        amountVatCents: 0,             // salaire = pas de TVA
        vatRateBp: 0,
      },
    });

    return { ok: true };
  } catch (e) {
    console.error("createSalary error", e);
    return { ok: false, error: "Erreur serveur" };
  }
}

/**
 * Suppression d’un salaire
 */
export async function deleteSalary(id: string) {
  if (!id) return;

  await prisma.expense.delete({
    where: { id },
  });
}
