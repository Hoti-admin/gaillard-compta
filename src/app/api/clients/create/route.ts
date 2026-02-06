import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1, "Nom obligatoire"),
  email: z.string().email("Email invalide").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = Schema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message ?? "Données invalides" },
        { status: 400 }
      );
    }

    const { name, email, phone, address } = parsed.data;

    const client = await prisma.client.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: client.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
