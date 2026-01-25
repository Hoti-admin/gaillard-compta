import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function chf(cents: number) {
  return Math.round(cents) / 100;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Paramètre year invalide" }, { status: 400 });
    }

    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: from, lt: to } },
      orderBy: { date: "asc" },
    });

    // --------- Détails
    const details = expenses.map((e) => {
      const d = new Date(e.date);
      const y = d.getUTCFullYear();
      const m = pad2(d.getUTCMonth() + 1);
      const day = pad2(d.getUTCDate());

      return {
        Date: `${y}-${m}-${day}`,
        Fournisseur: e.vendor,
        Catégorie: String(e.category),
        "Montant TTC (CHF)": chf(e.amountGrossCents),
        "Montant HT (CHF)": chf(e.amountNetCents),
        "Montant TVA (CHF)": chf(e.amountVatCents),
        "TVA %": Math.round((e.vatRateBp ?? 810) / 10) / 10,
        Notes: e.notes ?? "",
        Justificatif: e.receiptPath ? `storage:expenses/${e.receiptPath}` : "",
      };
    });

    // --------- Résumé par mois + catégorie
    // structure: map[monthKey][category] = cents
    const byMonth: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();

    for (const e of expenses) {
      const d = new Date(e.date);
      const monthKey = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
      const cat = String(e.category);
      categories.add(cat);

      if (!byMonth[monthKey]) byMonth[monthKey] = {};
      byMonth[monthKey][cat] = (byMonth[monthKey][cat] ?? 0) + e.amountGrossCents;
      byMonth[monthKey]["TOTAL"] = (byMonth[monthKey]["TOTAL"] ?? 0) + e.amountGrossCents;
    }

    const catList = Array.from(categories).sort();
    const months = Object.keys(byMonth).sort();

    const summary = months.map((month) => {
      const row: any = { Mois: month };
      for (const c of catList) row[c] = chf(byMonth[month][c] ?? 0);
      row.TOTAL = chf(byMonth[month]["TOTAL"] ?? 0);
      return row;
    });

    // Totaux annuels par catégorie (en bas)
    const totalsRow: any = { Mois: "TOTAL ANNUEL" };
    for (const c of catList) {
      let sum = 0;
      for (const month of months) sum += byMonth[month][c] ?? 0;
      totalsRow[c] = chf(sum);
    }
    let totalAnnual = 0;
    for (const month of months) totalAnnual += byMonth[month]["TOTAL"] ?? 0;
    totalsRow.TOTAL = chf(totalAnnual);
    summary.push(totalsRow);

    // --------- Excel workbook
    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé (mois)");

    const wsDetails = XLSX.utils.json_to_sheet(details);
    XLSX.utils.book_append_sheet(wb, wsDetails, "Détails");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="depenses-${year}.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur export Excel" }, { status: 500 });
  }
}
