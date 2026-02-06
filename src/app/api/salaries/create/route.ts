import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseIntSafe(v: any) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const employeeId = String(body.employeeId ?? "");
    const monthStr = String(body.month ?? ""); // attendu: "2026-02" par ex.
    const gross = parseIntSafe(body.grossCents);
    const charges = parseIntSafe(body.chargesCents);
    const net = parseIntSafe(body.netCents);

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId manquant" }, { status: 400 });
    }
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return NextResponse.json({ error: "month invalide (format YYYY-MM)" }, { status: 400 });
    }
    if (!Number.isFinite(gross) || gross < 0) {
      return NextResponse.json({ error: "grossCents invalide" }, { status: 400 });
    }
    if (!Number.isFinite(charges) || charges < 0) {
      return NextResponse.json({ error: "chargesCents invalide" }, { status: 400 });
    }
    if (!Number.isFinite(net) || net < 0) {
      return NextResponse.json({ error: "netCents invalide" }, { status: 400 });
    }

    // month = 1er jour du mois en UTC
    const month = new Date(`${monthStr}-01T00:00:00.000Z`);

    // ✅ Ici on ne sélectionne que des champs existants
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    });

    if (!emp) {
      return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
    }

    // upsert => 1 salaire par employé et par mois
    const salary = await prisma.salary.upsert({
      where: {
        employeeId_month: {
          employeeId,
          month,
        },
      },
      create: {
        employeeId,
        month,
        grossCents: gross,
        chargesCents: charges,
        netCents: net,
      },
      update: {
        grossCents: gross,
        chargesCents: charges,
        netCents: net,
      },
    });

    return NextResponse.json({ ok: true, salary });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: "Erreur serveur (create salary)" },
      { status: 500 }
    );
  }
}
