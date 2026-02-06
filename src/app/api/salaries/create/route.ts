import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const employeeId = String(body.employeeId ?? "");
    const year = Number(body.year);
    const month = Number(body.month);

    const grossCents = Number(body.grossCents);
    const chargesCents = Number(body.chargesCents);
    const netCents = Number(body.netCents);
    const notes = (body.notes ?? null) as string | null;

    if (!employeeId) return NextResponse.json({ error: "employeeId manquant" }, { status: 400 });
    if (!Number.isInteger(year) || year < 2000) return NextResponse.json({ error: "Année invalide" }, { status: 400 });
    if (!Number.isInteger(month) || month < 1 || month > 12) return NextResponse.json({ error: "Mois invalide" }, { status: 400 });

    for (const [k, v] of [
      ["grossCents", grossCents],
      ["chargesCents", chargesCents],
      ["netCents", netCents],
    ] as const) {
      if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: `${k} invalide` }, { status: 400 });
    }

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, type: true },
    });
    if (!emp) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });

    // ✅ Upsert salaire
    const salary = await prisma.salary.upsert({
      where: { employeeId_year_month: { employeeId, year, month } },
      update: { grossCents, chargesCents, netCents, notes },
      create: { employeeId, year, month, grossCents, chargesCents, netCents, notes },
    });

    // ✅ Créer / mettre à jour une dépense liée
    const category = emp.type === "CADRE" ? "SALAIRE_CADRE" : "SALAIRE_EMPLOYE";
    const totalCostCents = grossCents + chargesCents;

    const date = new Date(Date.UTC(year, month - 1, 1)); // 1er du mois (UTC)

    // Si une expense existe déjà liée -> update, sinon create
    const existingExpense = await prisma.expense.findFirst({
      where: { salaryId: salary.id },
      select: { id: true },
    });

    if (existingExpense) {
      await prisma.expense.update({
        where: { id: existingExpense.id },
        data: {
          date,
          vendor: emp.name,
          category: category as any,
          vatRateBp: 0,
          amountGrossCents: totalCostCents,
          amountNetCents: totalCostCents,
          amountVatCents: 0,
          notes: `Salaire ${String(month).padStart(2, "0")}.${year}${notes ? ` · ${notes}` : ""}`,
        },
      });
    } else {
      await prisma.expense.create({
        data: {
          date,
          vendor: emp.name,
          category: category as any,
          vatRateBp: 0,
          amountGrossCents: totalCostCents,
          amountNetCents: totalCostCents,
          amountVatCents: 0,
          notes: `Salaire ${String(month).padStart(2, "0")}.${year}${notes ? ` · ${notes}` : ""}`,
          salaryId: salary.id,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
