import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const now = new Date();
  const currentYear = now.getFullYear();

  // Param optionnel: year=2026, sinon on fait 3 ans
  const yearParam = url.searchParams.get("year");
  const years = yearParam
    ? [Number(yearParam)]
    : [currentYear, currentYear - 1, currentYear - 2];

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("TVA résumé");

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    const img = wb.addImage({ filename: logoPath, extension: "png" });
    ws.addImage(img, { tl: { col: 0, row: 0 }, ext: { width: 170, height: 55 } });
  }

  ws.getCell("A4").value = "TVA – facturée vs payée";
  ws.getCell("A4").font = { bold: true, size: 14 };

  ws.addRow([]);
  ws.addRow(["Année", "TVA facturée (clients)", "TVA payée (fournisseurs)", "Solde TVA (facturée - payée)"]);
  ws.getRow(ws.lastRow!.number).font = { bold: true };

  for (const y of years) {
    const from = new Date(`${y}-01-01T00:00:00.000Z`);
    const to = new Date(`${y + 1}-01-01T00:00:00.000Z`);

    const inv = await prisma.invoice.findMany({
      where: { status: { not: "CANCELED" }, issueDate: { gte: from, lt: to } },
      select: { amountVatCents: true },
      take: 100000,
    });

    const bills = await prisma.bill.findMany({
      where: { status: { not: "CANCELED" }, issueDate: { gte: from, lt: to } },
      select: { amountVatCents: true },
      take: 100000,
    });

    const vatInvoiced = inv.reduce((a, r) => a + r.amountVatCents, 0);
    const vatPaid = bills.reduce((a, r) => a + r.amountVatCents, 0);
    const balance = vatInvoiced - vatPaid;

    ws.addRow([y, vatInvoiced / 100, vatPaid / 100, balance / 100]);
  }

  ws.columns = [
    { width: 10 },
    { width: 22, style: { numFmt: "#,##0.00" } },
    { width: 26, style: { numFmt: "#,##0.00" } },
    { width: 28, style: { numFmt: "#,##0.00" } },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tva-resume.xlsx"`,
    },
  });
}
