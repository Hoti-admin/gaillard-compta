import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
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

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 30, { width: 140 });
  }

  doc.fillColor("#0f172a").fontSize(16).text(`Rapport achats fournisseurs – ${year}`, 40, 90);
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor("#334155").text(`Total TTC : ${(totalGross / 100).toFixed(2)} CHF`);
  doc.text(`Total HT : ${(totalNet / 100).toFixed(2)} CHF`);
  doc.text(`TVA payée : ${(totalVat / 100).toFixed(2)} CHF`);
  doc.moveDown(1);

  // Table
  const startX = 40;
  let y = doc.y;
  const col1 = 280, col2 = 80, col3 = 80, col4 = 80;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a");
  doc.text("Fournisseur", startX, y, { width: col1 });
  doc.text("TTC", startX + col1, y, { width: col2, align: "right" });
  doc.text("HT", startX + col1 + col2, y, { width: col3, align: "right" });
  doc.text("TVA", startX + col1 + col2 + col3, y, { width: col4, align: "right" });

  doc.moveTo(startX, y + 14).lineTo(555, y + 14).strokeColor("#e2e8f0").stroke();
  y += 22;

  doc.font("Helvetica").fontSize(10).fillColor("#0f172a");

  for (const r of rows) {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    doc.text(r.name, startX, y, { width: col1 });
    doc.text((r.gross / 100).toFixed(2), startX + col1, y, { width: col2, align: "right" });
    doc.text((r.net / 100).toFixed(2), startX + col1 + col2, y, { width: col3, align: "right" });
    doc.text((r.vat / 100).toFixed(2), startX + col1 + col2 + col3, y, { width: col4, align: "right" });
    y += 16;
  }

  doc.end();
  const pdf = await done;

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="achats-fournisseurs-${year}.pdf"`,
    },
  });
}
