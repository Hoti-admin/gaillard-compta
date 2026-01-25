"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/* =========================================================
   UTILS
========================================================= */

function toNumber(val: any) {
  const n = Number(String(val ?? "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error("Nombre invalide");
  return n;
}

function toDate(val: any) {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) throw new Error("Date invalide");
  return d;
}

/* =========================================================
   CLIENTS
========================================================= */

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name) throw new Error("Nom client requis");

  const client = await prisma.client.create({
    data: { name, email, phone, address },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

/* =========================================================
   SUPPLIERS
========================================================= */

export async function createSupplier(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name) throw new Error("Nom fournisseur requis");

  const supplier = await prisma.supplier.create({
    data: { name, email, phone, address },
  });

  revalidatePath("/suppliers");
  redirect(`/suppliers/${supplier.id}`);
}

/* =========================================================
   FACTURES CLIENTS
========================================================= */

export async function createInvoiceForClient(input: {
  clientId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  totalTtc: number;
  vatRateBp?: number; // 810 = 8.1%
  notes?: string | null;
}) {
  const clientId = input.clientId;
  const number = String(input.number ?? "").trim();
  const issueDate = toDate(input.issueDate);
  const dueDate = toDate(input.dueDate);
  const vatRateBp = Number.isFinite(Number(input.vatRateBp)) ? Number(input.vatRateBp) : 810;

  const totalTtc = toNumber(input.totalTtc);
  if (!clientId) throw new Error("clientId manquant");
  if (!number) throw new Error("Numéro facture requis");

  const rate = vatRateBp / 10000; // 810 -> 0.081
  const grossCents = Math.round(totalTtc * 100);
  const netCents = Math.round(grossCents / (1 + rate));
  const vatCents = Math.max(0, grossCents - netCents);

  const invoice = await prisma.invoice.create({
    data: {
      clientId,
      number,
      issueDate,
      dueDate,
      vatRateBp,
      amountGrossCents: grossCents,
      amountNetCents: netCents,
      amountVatCents: vatCents,
      notes: input.notes ?? null,
      // status = OPEN (default)
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/invoices");
  return invoice.id;
}

/* =========================================================
   PAIEMENTS FACTURES CLIENTS
========================================================= */

export async function addPaymentToInvoice(input: {
  invoiceId: string;
  date: string;
  amountCents: number;
  method?: string | null;
  reference?: string | null;
}) {
  const invoiceId = input.invoiceId;
  const date = toDate(input.date);
  const amountCents = Math.round(toNumber(input.amountCents));

  if (!invoiceId) throw new Error("invoiceId manquant");
  if (amountCents <= 0) throw new Error("Montant invalide");

  await prisma.payment.create({
    data: {
      invoiceId,
      date,
      amountCents,
      method: input.method ?? "Virement",
      reference: input.reference ?? null,
    },
  });

  revalidatePath("/invoices");
}

/* =========================================================
   FACTURES FOURNISSEURS (BILLS)
========================================================= */

export async function createBillForSupplier(input: {
  supplierId: string;
  number?: string | null;
  issueDate: string;
  dueDate: string;
  totalTtc: number;
  vatRateBp?: number;
  notes?: string | null;
}) {
  const supplierId = input.supplierId;
  const issueDate = toDate(input.issueDate);
  const dueDate = toDate(input.dueDate);
  const vatRateBp = Number.isFinite(Number(input.vatRateBp)) ? Number(input.vatRateBp) : 810;

  const totalTtc = toNumber(input.totalTtc);
  if (!supplierId) throw new Error("supplierId manquant");

  const rate = vatRateBp / 10000;
  const grossCents = Math.round(totalTtc * 100);
  const netCents = Math.round(grossCents / (1 + rate));
  const vatCents = Math.max(0, grossCents - netCents);

  const bill = await prisma.bill.create({
    data: {
      supplierId,
      number: input.number ? String(input.number).trim() : null,
      issueDate,
      dueDate,
      vatRateBp,
      amountGrossCents: grossCents,
      amountNetCents: netCents,
      amountVatCents: vatCents,
      notes: input.notes ?? null,
      // status OPEN default
    },
  });

  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/bills");
  return bill.id;
}

/* =========================================================
   PAIEMENTS FOURNISSEURS
========================================================= */

export async function addPaymentToBill(input: {
  billId: string;
  date: string;
  amountCents: number;
  method?: string | null;
  reference?: string | null;
}) {
  const billId = input.billId;
  const date = toDate(input.date);
  const amountCents = Math.round(toNumber(input.amountCents));

  if (!billId) throw new Error("billId manquant");
  if (amountCents <= 0) throw new Error("Montant invalide");

  await prisma.billPayment.create({
    data: {
      billId,
      date,
      amountCents,
      method: input.method ?? "Virement",
      reference: input.reference ?? null,
    },
  });

  revalidatePath("/bills");
}

/* =========================================================
   DÉPENSES ENTREPRISE (RESTAURANT, DIVERS…)
========================================================= */

export async function createExpense(formData: FormData) {
  const date = toDate(formData.get("date"));
  const vendor = String(formData.get("vendor") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const totalTtc = toNumber(formData.get("totalTtc"));
  const vatRate = toNumber(formData.get("vatRate") ?? "8.1");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!vendor) throw new Error("Fournisseur / restaurant requis");
  if (!category) throw new Error("Catégorie requise");

  const vatRateBp = Math.round(vatRate * 100);
  const rate = vatRateBp / 10000;

  const grossCents = Math.round(totalTtc * 100);
  const netCents = Math.round(grossCents / (1 + rate));
  const vatCents = Math.max(0, grossCents - netCents);

  await prisma.expense.create({
    data: {
      date,
      vendor,
      category: category as any,
      vatRateBp,
      amountGrossCents: grossCents,
      amountNetCents: netCents,
      amountVatCents: vatCents,
      notes,
    },
  });

  revalidatePath("/expenses");
}

/* =========================================================
   SUPPRESSION DÉPENSE
========================================================= */

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.expense.delete({ where: { id } });
  revalidatePath("/expenses");
}
