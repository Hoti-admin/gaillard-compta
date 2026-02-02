"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ExpenseCategory } from "@prisma/client";

function toCents(chf: string) {
  // accepte "12", "12.5", "12,50", "10 695,50", "10’695.50"
  const cleaned = String(chf)
    .trim()
    .replace(/\s/g, "")
    .replace(/’/g, "")
    .replace(/'/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

function bpFromPercent(p: string) {
  // "8.1" => 810
  const cleaned = String(p).trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

function computeVat(amountGrossCents: number, vatRateBp: number) {
  // gross = net + vat ; rate = 810 => 8.10%
  const rate = vatRateBp / 10000;
  const net = Math.round(amountGrossCents / (1 + rate));
  const vat = amountGrossCents - net;
  return { net, vat };
}

function parseCategory(raw: string): ExpenseCategory {
  // sécurise l’input au cas où
  const key = String(raw ?? "").trim() as ExpenseCategory;
  if (!key || !(key in ExpenseCategory)) {
    // fallback
    return ExpenseCategory.DIVERS;
  }
  return key;
}

export async function createExpense(formData: FormData) {
  const dateStr = String(formData.get("date") ?? "");
  const vendor = String(formData.get("vendor") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "");
  const ttcStr = String(formData.get("ttc") ?? "");
  const vatPercent = String(formData.get("vat") ?? "8.1");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!dateStr) throw new Error("Date manquante");
  if (!vendor) throw new Error("Nom/Fournisseur manquant");

  const amountGrossCents = toCents(ttcStr);
  if (!Number.isFinite(amountGrossCents) || amountGrossCents < 0) {
    throw new Error("Montant TTC invalide");
  }

  const vatRateBp = bpFromPercent(vatPercent);
  if (!Number.isFinite(vatRateBp) || vatRateBp < 0) {
    throw new Error("Taux TVA invalide");
  }

  const category = parseCategory(categoryRaw);
  const { net, vat } = computeVat(amountGrossCents, vatRateBp);

  await prisma.expense.create({
    data: {
      date: new Date(dateStr),
      vendor,
      category,
      vatRateBp,
      amountGrossCents,
      amountNetCents: net,
      amountVatCents: vat,
      notes: notes || null,
    },
  });

  revalidatePath("/expenses");
}

export async function updateExpense(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const dateStr = String(formData.get("date") ?? "");
  const vendor = String(formData.get("vendor") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "");
  const ttcStr = String(formData.get("ttc") ?? "");
  const vatPercent = String(formData.get("vat") ?? "8.1");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!id) throw new Error("ID manquant");
  if (!dateStr) throw new Error("Date manquante");
  if (!vendor) throw new Error("Nom/Fournisseur manquant");

  const amountGrossCents = toCents(ttcStr);
  if (!Number.isFinite(amountGrossCents) || amountGrossCents < 0) {
    throw new Error("Montant TTC invalide");
  }

  const vatRateBp = bpFromPercent(vatPercent);
  if (!Number.isFinite(vatRateBp) || vatRateBp < 0) {
    throw new Error("Taux TVA invalide");
  }

  const category = parseCategory(categoryRaw);
  const { net, vat } = computeVat(amountGrossCents, vatRateBp);

  await prisma.expense.update({
    where: { id },
    data: {
      date: new Date(dateStr),
      vendor,
      category,
      vatRateBp,
      amountGrossCents,
      amountNetCents: net,
      amountVatCents: vat,
      notes: notes || null,
    },
  });

  revalidatePath("/expenses");
}

export async function deleteExpense(id: string) {
  const cleanId = String(id ?? "").trim();
  if (!cleanId) return;
  await prisma.expense.delete({ where: { id: cleanId } });
  revalidatePath("/expenses");
}
