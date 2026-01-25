import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Body = {
  invoiceId: string;
  number: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const invoiceId = body.invoiceId?.trim();
    const number = body.number?.trim();

    if (!invoiceId) return NextResponse.json({ error: "invoiceId manquant" }, { status: 400 });
    if (!number) return NextResponse.json({ error: "Numéro vide" }, { status: 400 });

    // Unicité
    const exists = await prisma.invoice.findFirst({
      where: { number, NOT: { id: invoiceId } },
      select: { id: true },
    });

    if (exists) return NextResponse.json({ error: "Ce numéro existe déjà" }, { status: 400 });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { number },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
