import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { daysLate, sumPaidCents } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());
  const now = new Date();

  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "CANCELED" }, issueDate: { gte: from, lt: to } },
    include: { client: true, payments: true },
    take: 100000,
  });

  const map = new Map<string, { name: string; lateCents: number; maxLate: number; count: number }>();

  for (const i of invoices) {
    const paid = sumPaidCents(i.payments);
    const outstanding = Math.max(0, i.amountGrossCents - paid);
    const late = daysLate(i.dueDate, outstanding, now);
    if (late <= 0 || outstanding <= 0) continue;

    const cur = map.get(i.clientId) || { name: i.client.name, lateCents: 0, maxLate: 0, count: 0 };
    cur.lateCents += outstanding;
    cur.maxLate = Math.max(cur.maxLate, late);
    cur.count += 1;
    map.set(i.clientId, cur);
  }

  const rows = Array.from(map.values()).sort((a, b) => b.lateCents - a.lateCents);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Clients en retard ${year}`);

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    const img = wb.addImage({ filename: logoPath, extension: "png" });
    ws.addImage(img, { tl: { col: 0, row: 0 }, ext: { width: 170, height: 55 } });
  }

  ws.getCell("A4").value = `Clients en retard – ${year}`;
  ws.getCell("A4").font = { bold: true, size: 14 };

  ws.addRow([]);
  ws.addRow(["Client", "Montant en retard (CHF)", "Nb factures", "Retard max (jours)"]);

  ws.getRow(ws.lastRow!.number).font = { bold: true };

  for (const r of rows) {
    ws.addRow([r.name, r.lateCents / 100, r.count, r.maxLate]);
  }

  ws.columns = [
    { width: 44 },
    { width: 22, style: { numFmt: "#,##0.00" } },
    { width: 14 },
    { width: 18 },
  ];

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clients-en-retard-${year}.xlsx"`,
    },
  });
}
