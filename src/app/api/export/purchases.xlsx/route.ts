
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());

  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const bills = await prisma.bill.findMany({
    where: { issueDate: { gte: from, lt: to }, status: { not: "CANCELED" } },
    include: { supplier: true },
    take: 100000,
  });

  const map = new Map<string, { name: string; gross: number; net: number; vat: number }>();
  for (const b of bills) {
    const cur = map.get(b.supplierId) || { name: b.supplier.name, gross: 0, net: 0, vat: 0 };
    cur.gross += b.amountGrossCents;
    cur.net += b.amountNetCents;
    cur.vat += b.amountVatCents;
    map.set(b.supplierId, cur);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.gross - a.gross);

  const totalGross = rows.reduce((a, r) => a + r.gross, 0);
  const totalNet = rows.reduce((a, r) => a + r.net, 0);
  const totalVat = rows.reduce((a, r) => a + r.vat, 0);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Achats ${year}`);

  // Logo (optionnel)
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    const img = wb.addImage({ filename: logoPath, extension: "png" });
    ws.addImage(img, { tl: { col: 0, row: 0 }, ext: { width: 170, height: 55 } });
  }

  ws.getCell("A4").value = `Rapport achats fournisseurs – ${year}`;
  ws.getCell("A4").font = { bold: true, size: 14 };

  ws.getCell("A5").value = `Total TTC: ${(totalGross / 100).toFixed(2)} CHF | Total HT: ${(totalNet / 100).toFixed(2)} CHF | TVA payée: ${(totalVat / 100).toFixed(2)} CHF`;
  ws.getCell("A5").font = { size: 11 };

  ws.addRow([]);
  ws.addRow(["Fournisseur", "Total TTC (CHF)", "Total HT (CHF)", "TVA payée (CHF)"]);

  const headerRow = ws.getRow(ws.lastRow!.number);
  headerRow.font = { bold: true };
  headerRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    c.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
  });

  for (const r of rows) {
    ws.addRow([r.name, r.gross / 100, r.net / 100, r.vat / 100]);
  }

  ws.columns = [
    { width: 45 },
    { width: 18, style: { numFmt: "#,##0.00" } },
    { width: 18, style: { numFmt: "#,##0.00" } },
    { width: 18, style: { numFmt: "#,##0.00" } },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="achats-fournisseurs-${year}.xlsx"`,
    },
  });
}
