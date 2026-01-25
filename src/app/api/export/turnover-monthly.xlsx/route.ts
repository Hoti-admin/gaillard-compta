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

  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELED" }, issueDate: { gte: from, lt: to } },
    take: 100000,
  });

  const months = Array.from({ length: 12 }, (_, i) => ({
    m: i + 1,
    gross: 0,
    net: 0,
    vat: 0,
  }));

  for (const i of invoices) {
    const d = i.issueDate;
    const m = d.getUTCMonth(); // 0-11
    months[m].gross += i.amountGrossCents;
    months[m].net += i.amountNetCents;
    months[m].vat += i.amountVatCents;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`CA mensuel ${year}`);

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    const img = wb.addImage({ filename: logoPath, extension: "png" });
    ws.addImage(img, { tl: { col: 0, row: 0 }, ext: { width: 170, height: 55 } });
  }

  ws.getCell("A4").value = `CA clients par mois – ${year}`;
  ws.getCell("A4").font = { bold: true, size: 14 };

  ws.addRow([]);
  ws.addRow(["Mois", "CA TTC (CHF)", "CA HT (CHF)", "TVA facturée (CHF)"]);
  ws.getRow(ws.lastRow!.number).font = { bold: true };

  const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

  for (const row of months) {
    ws.addRow([monthLabels[row.m - 1], row.gross / 100, row.net / 100, row.vat / 100]);
  }

  const totalGross = months.reduce((a, r) => a + r.gross, 0);
  const totalNet = months.reduce((a, r) => a + r.net, 0);
  const totalVat = months.reduce((a, r) => a + r.vat, 0);

  ws.addRow([]);
  ws.addRow(["TOTAL", totalGross / 100, totalNet / 100, totalVat / 100]).font = { bold: true };

  ws.columns = [
    { width: 14 },
    { width: 18, style: { numFmt: "#,##0.00" } },
    { width: 18, style: { numFmt: "#,##0.00" } },
    { width: 20, style: { numFmt: "#,##0.00" } },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ca-mensuel-${year}.xlsx"`,
    },
  });
}
