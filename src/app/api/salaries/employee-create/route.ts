import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1),
  type: z.enum(["EMPLOYE", "CADRE"]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type } = Schema.parse(body);

    const employee = await prisma.employee.create({
      data: {
        name,
        type, // ✅ OBLIGATOIRE
      },
    });

    return NextResponse.json(employee);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message ?? "Erreur création employé" },
      { status: 400 }
    );
  }
}
