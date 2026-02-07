import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  date: z.string().min(1), // "2026-02-07"
  vendor: z.string().min(1),
  category: z.string().min(1),

  // montants en CENTIMES
  amountGrossCents: z.number().int().nonnegative(),
  vatRateBp: z.number().int().min(0).max(10000).optional(), // ex: 810 = 8.1%
  notes: z.string().optional().nullable(),

  // IMPORTANT: on accepte receiptPath si un vieux front l’envoie,
  // mais on l’ignore (colonne inexistante en DB).
  receiptPath: z.any().optional(),
});

function computeVatParts(grossCents: number, vatRateBp: number) {
  // vatRateBp = 810 => 8.10%
  // net = gross / (1 + rate)
  const rate = vatRateBp / 10000;
  const net = Math.round(grossCents / (1 + rate));
  const vat = grossCents - net;
  return { net, vat };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date, vendor, category, amountGrossCents } = parsed.data;
    const vatRateBp = parsed.data.vatRateBp ?? 810;
    const notes = parsed.data.notes?.trim() ? parsed.data.notes.trim() : null;

    const { net, vat } = computeVatParts(amountGrossCents, vatRateBp);

    const expense = await prisma.expense.create({
      data: {
        // En DB c’est un DATE, Prisma accepte un Date JS
        date: new Date(date),
        vendor,
        category,
        vatRateBp,
        amountGrossCents,
        amountNetCents: net,
        amountVatCents: vat,
        notes,
        // ✅ PAS de receiptPath (colonne inexistante)
      },
    });

    return NextResponse.json({ ok: true, expense });
  } catch (err: any) {
    console.error("API /expenses/create error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
