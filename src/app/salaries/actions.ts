"use server";

import { prisma } from "@/lib/prisma";

function toCents(input: unknown) {
  const s = String(input ?? "").trim().replace("CHF", "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export async function createSalary(formData: FormData) {
  const employee = String(formData.get("employee") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "").trim();
  const amountCents = toCents(formData.get("amount"));

  if (!employee) return { ok: false, error: "Nom employé manquant" };
  if (!["SALAIRE_EMPLOYE", "SALAIRE_CADRE"].includes(type))
    return { ok: false, error: "Type salaire invalide" };
  if (!dateStr) return { ok: false, error: "Date manquante" };
  if (amountCents == null) return { ok: false, error: "Montant invalide" };

  await prisma.expense.create({
    data: {
      date: new Date(dateStr),
      vendor: employee,
      category: type as any,

      // Salaire: pas de TVA
      vatRateBp: 0,
      amountGrossCents: amountCents,
      amountNetCents: amountCents,
      amountVatCents: 0,

      notes: "Salaire",
    },
  });

  return { ok: true };
}

export async function deleteSalary(id: string) {
  await prisma.expense.delete({ where: { id } });
  return { ok: true };
}
