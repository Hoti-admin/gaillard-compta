import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
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

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const logoPath = path.join(process.cwd(), "public", "logo.png");
  if (fs.existsSync(logoPath)) doc.image(logoPath, 40, 30, { width: 140 });

  doc.fillColor("#0f172a").fontSize(16).text(`Clients en retard – ${year}`, 40, 90);
  doc.moveDown(1);

  const startX = 40;
  let y = doc.y;
  const col1 = 280, col2 = 90, col3 = 60, col4 = 70;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Client", startX, y, { width: col1 });
  doc.text("Retard CHF", startX + col1, y, { width: col2, align: "right" });
  doc.text("Nb", startX + col1 + col2, y, { width: col3, align: "right" });
  doc.text("Max j", startX + col1 + col2 + col3, y, { width: col4, align: "right" });
  doc.moveTo(startX, y + 14).lineTo(555, y + 14).strokeColor("#e2e8f0").stroke();
  y += 22;

  doc.font("Helvetica").fontSize(10).fillColor("#0f172a");

  for (const r of rows) {
    if (y > 760) { doc.addPage(); y = 40; }
    doc.text(r.name, startX, y, { width: col1 });
    doc.text((r.lateCents / 100).toFixed(2), startX + col1, y, { width: col2, align: "right" });
    doc.text(String(r.count), startX + col1 + col2, y, { width: col3, align: "right" });
    doc.text(String(r.maxLate), startX + col1 + col2 + col3, y, { width: col4, align: "right" });
    y += 16;
  }

  doc.end();
  const pdf = await done;

  return new NextResponse(new Uint8Array(pdf), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="clients-en-retard-${year}.pdf"`,
  },
});
}
