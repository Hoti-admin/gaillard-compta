import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { parseCHFToCents } from "@/lib/utils";
import { rateBpFromPercentString, splitGrossToNetVat } from "@/lib/tax";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "Fichier manquant" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

  let created = 0;
  const errors: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const supplierName = String(r.supplier || "").trim();
    const issueDateStr = String(r.issueDate || "").trim();
    const dueDateStr = String(r.dueDate || "").trim();
    const number = String(r.number || "").trim() || null;
    const grossStr = String(r.gross || "").trim();
    const vatRateStr = String(r.vatRate || "8.1").trim() || "8.1";

    if (!supplierName || !issueDateStr || !dueDateStr || !grossStr) {
      errors.push({ row: i + 2, error: "Champs manquants (supplier/issueDate/dueDate/gross)" });
      continue;
    }

    const grossCents = parseCHFToCents(grossStr);
    const vatRateBp = rateBpFromPercentString(vatRateStr);
    const { netCents, vatCents } = splitGrossToNetVat(grossCents, vatRateBp);

    try {
      const supplier = await prisma.supplier.upsert({
        where: { name: supplierName },
        update: {},
        create: { name: supplierName },
      });

      await prisma.bill.create({
        data: {
          supplierId: supplier.id,
          number,
          issueDate: new Date(issueDateStr),
          dueDate: new Date(dueDateStr),
          vatRateBp,
          amountGrossCents: grossCents,
          amountNetCents: netCents,
          amountVatCents: vatCents,
        },
      });

      created++;
    } catch (e: any) {
      errors.push({ row: i + 2, error: e?.message || "Erreur inconnue" });
    }
  }

  return NextResponse.json({ ok: true, created, errors });
}
