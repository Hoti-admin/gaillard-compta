import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const type = String(body.type ?? "EMPLOYE");

    if (!name) return NextResponse.json({ error: "Nom manquant" }, { status: 400 });
    if (type !== "EMPLOYE" && type !== "CADRE")
      return NextResponse.json({ error: "Type invalide" }, { status: 400 });

    await prisma.employee.create({
      data: { name, type: type as any, active: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
