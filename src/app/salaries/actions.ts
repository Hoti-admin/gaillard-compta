"use server";

import { prisma } from "@/lib/prisma";

export async function createSalary(fd: FormData) {
  try {
    const employee = String(fd.get("employee") ?? "").trim();
    const type = String(fd.get("type") ?? "SALAIRE_EMPLOYE");
    const dateStr = String(fd.get("date") ?? "");
    const amountStr = String(fd.get("amount") ?? "").replace(",", ".");

    if (!employee) return { ok: false, error: "Employé manquant" };

    const cents = Math.round(Number(amountStr) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return { ok: false, error: "Montant invalide" };

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { ok: false, error: "Date invalide" };

    const category = type === "SALAIRE_CADRE" ? "SALAIRE_CADRE" : "SALAIRE_EMPLOYE";

    await prisma.expense.create({
      data: {
        vendor: employee,
        category: category as any,
        date,
        amountGrossCents: cents,
        amountNetCents: cents,
        amountVatCents: 0,
        vatRateBp: 0,
      },
    });

    return { ok: true };
  } catch (e) {
    console.error("createSalary error", e);
    return { ok: false, error: "Erreur serveur" };
  }
}

export async function deleteSalary(id: string) {
  try {
    if (!id) return;
    await prisma.expense.delete({ where: { id } });
  } catch (e) {
    console.error("deleteSalary error", e);
  }
}
