import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = String(body.id ?? "");

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // ✅ On ne gère plus receiptPath (pas dans la DB)
    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
