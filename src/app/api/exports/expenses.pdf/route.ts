import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function chfFromCents(cents: number) {
  const v = (cents || 0) / 100;
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("fr-CH").format(d);
}

function catLabel(cat: string) {
  // adapte si tu as d'autres valeurs dans ExpenseCategory
  const map: Record<string, string> = {
    RESTAURANT: "Restaurant",
    PARKING: "Parking",
    CARBURANT: "Carburant",
    FOURNITURES: "Fournitures",
    DIVERS: "Divers",
    DEPLACEMENT: "Déplacement",
    TELEPHONE: "Téléphone",
    OUTILS: "Outils",
  };
  return map[cat] ?? cat;
}

function safeText(v: any) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function loadLogoBytes() {
  // ✅ Mets ton logo ici : public/gaillard-logo.jpg
  const logoPath = path.join(process.cwd(), "public", "gaillard-logo.jpg");
  if (fs.existsSync(logoPath)) {
    return fs.readFileSync(logoPath);
  }

  // fallback jpg
  const logoJpg = path.join(process.cwd(), "public", "gaillard-logo.jpg");
  if (fs.existsSync(logoJpg)) {
    return fs.readFileSync(logoJpg);
  }

  return null;
}

function isPng(buf: Buffer) {
  return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") || new Date().getFullYear());

    const from = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: from, lt: to } },
      orderBy: [{ date: "asc" }, { vendor: "asc" }],
    });

    // Totaux
    const totalsByCategory = new Map<string, { gross: number; net: number; vat: number }>();
    let grossTotal = 0;
    let netTotal = 0;
    let vatTotal = 0;

    for (const e of expenses) {
      const cat = (e as any).category as string;
      const g = Number((e as any).amountGrossCents || 0);
      const n = Number((e as any).amountNetCents || 0);
      const v = Number((e as any).amountVatCents || 0);

      grossTotal += g;
      netTotal += n;
      vatTotal += v;

      const cur = totalsByCategory.get(cat) ?? { gross: 0, net: 0, vat: 0 };
      cur.gross += g;
      cur.net += n;
      cur.vat += v;
      totalsByCategory.set(cat, cur);
    }

    // PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 portrait (points)
    const { width, height } = page.getSize();

    // Fonts
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // Colors “fiduciaire” bleu/gris
    const slate900 = rgb(0.06, 0.09, 0.16);
    const slate600 = rgb(0.35, 0.41, 0.49);
    const slate200 = rgb(0.90, 0.92, 0.95);
    const blue600 = rgb(0.14, 0.36, 0.75);

    const margin = 40;
    let y = height - margin;

    // Header band
    page.drawRectangle({
      x: margin,
      y: y - 62,
      width: width - margin * 2,
      height: 62,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: slate200,
      borderWidth: 1,
    });

    // Logo
    const logoBytes = loadLogoBytes();
    if (logoBytes) {
      try {
        if (isPng(logoBytes)) {
          const img = await pdf.embedPng(logoBytes);
          const imgW = 90;
          const imgH = (img.height / img.width) * imgW;
          page.drawImage(img, {
            x: margin + 14,
            y: y - 52 + (52 - imgH) / 2,
            width: imgW,
            height: imgH,
          });
        } else {
          const img = await pdf.embedJpg(logoBytes);
          const imgW = 90;
          const imgH = (img.height / img.width) * imgW;
          page.drawImage(img, {
            x: margin + 14,
            y: y - 52 + (52 - imgH) / 2,
            width: imgW,
            height: imgH,
          });
        }
      } catch {
        // si le logo n'arrive pas à s'embed, on ignore sans casser le PDF
      }
    } else {
      // petit carré si pas de logo
      page.drawRectangle({
        x: margin + 14,
        y: y - 52 + 10,
        width: 36,
        height: 36,
        color: blue600,
        page.drawRectangle({
  x: ...,
  y: ...,
  width: ...,
  height: ...,
  color: blue600,
});
      });
    }

    // Title / subtitle
    page.drawText(`Dépenses – Rapport fiduciaire`, {
      x: margin + 120,
      y: y - 30,
      size: 16,
      font: fontBold,
      color: slate900,
    });
    page.drawText(`Année ${year} · Montants en CHF`, {
      x: margin + 120,
      y: y - 48,
      size: 10,
      font,
      color: slate600,
    });

    // Content start
    y -= 80;

    // Table config
    const tableX = margin;
    const tableW = width - margin * 2;
    const rowH = 20;

    // Columns
    const colDate = 70;
    const colCat = 95;
    const colVendor = tableW - (colDate + colCat + 80 + 80 + 80); // reste
    const colTtc = 80;
    const colHt = 80;
    const colTva = 80;

    function drawTableHeader() {
      page.drawRectangle({
        x: tableX,
        y: y - rowH,
        width: tableW,
        height: rowH,
        color: rgb(0.94, 0.96, 0.99),
        borderColor: slate200,
        borderWidth: 1,
      });

      const ty = y - 14;
      page.drawText("Date", { x: tableX + 8, y: ty, size: 10, font: fontBold, color: slate900 });
      page.drawText("Catégorie", { x: tableX + colDate + 8, y: ty, size: 10, font: fontBold, color: slate900 });
      page.drawText("Fournisseur / Libellé", {
        x: tableX + colDate + colCat + 8,
        y: ty,
        size: 10,
        font: fontBold,
        color: slate900,
      });
      page.drawText("TTC", { x: tableX + colDate + colCat + colVendor + 8, y: ty, size: 10, font: fontBold, color: slate900 });
      page.drawText("HT", { x: tableX + colDate + colCat + colVendor + colTtc + 8, y: ty, size: 10, font: fontBold, color: slate900 });
      page.drawText("TVA", { x: tableX + colDate + colCat + colVendor + colTtc + colHt + 8, y: ty, size: 10, font: fontBold, color: slate900 });

      y -= rowH;
    }

    function drawRow(vals: { date: string; cat: string; vendor: string; ttc: string; ht: string; tva: string }, alt: boolean) {
      page.drawRectangle({
        x: tableX,
        y: y - rowH,
        width: tableW,
        height: rowH,
        color: alt ? rgb(0.99, 0.99, 1) : rgb(1, 1, 1),
        borderColor: slate200,
        borderWidth: 1,
      });

      const ty = y - 14;
      page.drawText(vals.date, { x: tableX + 8, y: ty, size: 9.5, font, color: slate900 });
      page.drawText(vals.cat, { x: tableX + colDate + 8, y: ty, size: 9.5, font, color: slate900 });

      // vendor tronqué si trop long
      const vendor = vals.vendor.length > 52 ? vals.vendor.slice(0, 49) + "…" : vals.vendor;
      page.drawText(vendor, { x: tableX + colDate + colCat + 8, y: ty, size: 9.5, font, color: slate900 });

      // Montants alignés à droite
      const right = (text: string, xRight: number) => {
        const w = font.widthOfTextAtSize(text, 9.5);
        page.drawText(text, { x: xRight - w, y: ty, size: 9.5, font, color: slate900 });
      };

      right(vals.ttc, tableX + colDate + colCat + colVendor + colTtc - 8);
      right(vals.ht, tableX + colDate + colCat + colVendor + colTtc + colHt - 8);
      right(vals.tva, tableX + colDate + colCat + colVendor + colTtc + colHt + colTva - 8);

      y -= rowH;
    }

    // Draw table with page breaks
    drawTableHeader();

    let alt = false;
    for (const e of expenses) {
      if (y < 140) {
        // footer old page
        page.drawText(`GAILLARD Jean-Paul SA · Rapport dépenses · ${year}`, {
          x: margin,
          y: 28,
          size: 9,
          font,
          color: slate600,
        });

        // new page
        const p = pdf.addPage([595.28, 841.89]);
        (page as any) = p; // TS hack not allowed => so we avoid reassignment by creating a new var pattern
      }
    }

    // ✅ pdf-lib ne permet pas de réassigner "page" proprement en TS strict si const.
    // On fait un mini “renderer” qui gère multi-pages sans réassignation.
    // => On refait la boucle avec un système de pages.

    // Recreate with multi-page cleanly
    const pdf2 = await PDFDocument.create();
    const font2 = await pdf2.embedFont(StandardFonts.Helvetica);
    const fontBold2 = await pdf2.embedFont(StandardFonts.HelveticaBold);

    const logoBytes2 = loadLogoBytes();
    const pages: any[] = [];
    const newPage = async () => {
      const p = pdf2.addPage([595.28, 841.89]);
      pages.push(p);
      return p;
    };

    let p = await newPage();
    const w2 = p.getSize().width;
    const h2 = p.getSize().height;
    let y2 = h2 - margin;

    const drawHeader = async () => {
      p.drawRectangle({
        x: margin,
        y: y2 - 62,
        width: w2 - margin * 2,
        height: 62,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: slate200,
        borderWidth: 1,
      });

      if (logoBytes2) {
        try {
          if (isPng(logoBytes2)) {
            const img = await pdf2.embedPng(logoBytes2);
            const imgW = 90;
            const imgH = (img.height / img.width) * imgW;
            p.drawImage(img, {
              x: margin + 14,
              y: y2 - 52 + (52 - imgH) / 2,
              width: imgW,
              height: imgH,
            });
          } else {
            const img = await pdf2.embedJpg(logoBytes2);
            const imgW = 90;
            const imgH = (img.height / img.width) * imgW;
            p.drawImage(img, {
              x: margin + 14,
              y: y2 - 52 + (52 - imgH) / 2,
              width: imgW,
              height: imgH,
            });
          }
        } catch {}
      } else {
        p.drawRectangle({
          x: margin + 14,
          y: y2 - 52 + 10,
          width: 36,
          height: 36,
          color: blue600,
        });
      }

      p.drawText(`Dépenses – Rapport fiduciaire`, {
        x: margin + 120,
        y: y2 - 30,
        size: 16,
        font: fontBold2,
        color: slate900,
      });
      p.drawText(`Année ${year} · Montants en CHF`, {
        x: margin + 120,
        y: y2 - 48,
        size: 10,
        font: font2,
        color: slate600,
      });

      y2 -= 80;
    };

    const drawFooter = () => {
      p.drawText(`GAILLARD Jean-Paul SA · Rapport dépenses · ${year}`, {
        x: margin,
        y: 28,
        size: 9,
        font: font2,
        color: slate600,
      });
      // num page
      const pageNo = pages.length;
      const txt = `Page ${pageNo}`;
      const tw = font2.widthOfTextAtSize(txt, 9);
      p.drawText(txt, { x: w2 - margin - tw, y: 28, size: 9, font: font2, color: slate600 });
    };

    const drawTableHeader2 = () => {
      p.drawRectangle({
        x: tableX,
        y: y2 - rowH,
        width: tableW,
        height: rowH,
        color: rgb(0.94, 0.96, 0.99),
        borderColor: slate200,
        borderWidth: 1,
      });

      const ty = y2 - 14;
      p.drawText("Date", { x: tableX + 8, y: ty, size: 10, font: fontBold2, color: slate900 });
      p.drawText("Catégorie", { x: tableX + colDate + 8, y: ty, size: 10, font: fontBold2, color: slate900 });
      p.drawText("Fournisseur / Libellé", {
        x: tableX + colDate + colCat + 8,
        y: ty,
        size: 10,
        font: fontBold2,
        color: slate900,
      });
      p.drawText("TTC", { x: tableX + colDate + colCat + colVendor + 8, y: ty, size: 10, font: fontBold2, color: slate900 });
      p.drawText("HT", { x: tableX + colDate + colCat + colVendor + colTtc + 8, y: ty, size: 10, font: fontBold2, color: slate900 });
      p.drawText("TVA", { x: tableX + colDate + colCat + colVendor + colTtc + colHt + 8, y: ty, size: 10, font: fontBold2, color: slate900 });

      y2 -= rowH;
    };

    const drawRow2 = (vals: { date: string; cat: string; vendor: string; ttc: string; ht: string; tva: string }, altRow: boolean) => {
      p.drawRectangle({
        x: tableX,
        y: y2 - rowH,
        width: tableW,
        height: rowH,
        color: altRow ? rgb(0.99, 0.99, 1) : rgb(1, 1, 1),
        borderColor: slate200,
        borderWidth: 1,
      });

      const ty = y2 - 14;
      p.drawText(vals.date, { x: tableX + 8, y: ty, size: 9.5, font: font2, color: slate900 });
      p.drawText(vals.cat, { x: tableX + colDate + 8, y: ty, size: 9.5, font: font2, color: slate900 });

      const vendor = vals.vendor.length > 52 ? vals.vendor.slice(0, 49) + "…" : vals.vendor;
      p.drawText(vendor, { x: tableX + colDate + colCat + 8, y: ty, size: 9.5, font: font2, color: slate900 });

      const right = (text: string, xRight: number) => {
        const tw = font2.widthOfTextAtSize(text, 9.5);
        p.drawText(text, { x: xRight - tw, y: ty, size: 9.5, font: font2, color: slate900 });
      };

      right(vals.ttc, tableX + colDate + colCat + colVendor + colTtc - 8);
      right(vals.ht, tableX + colDate + colCat + colVendor + colTtc + colHt - 8);
      right(vals.tva, tableX + colDate + colCat + colVendor + colTtc + colHt + colTva - 8);

      y2 -= rowH;
    };

    await drawHeader();
    drawTableHeader2();

    let alt2 = false;
    for (const e of expenses) {
      if (y2 < 140) {
        drawFooter();
        p = await newPage();
        y2 = h2 - margin;
        await drawHeader();
        drawTableHeader2();
      }

      const date = fmtDate(new Date((e as any).date));
      const cat = catLabel(String((e as any).category));
      const vendor = safeText((e as any).vendor);
      const ttc = chfFromCents(Number((e as any).amountGrossCents || 0));
      const ht = chfFromCents(Number((e as any).amountNetCents || 0));
      const tva = chfFromCents(Number((e as any).amountVatCents || 0));

      drawRow2({ date, cat, vendor, ttc, ht, tva }, alt2);
      alt2 = !alt2;
    }

    // Totaux par catégorie
    if (y2 < 220) {
      drawFooter();
      p = await newPage();
      y2 = h2 - margin;
      await drawHeader();
    }

    // Bloc totaux
    const boxH = 18 + (totalsByCategory.size + 2) * 16 + 14;
    p.drawRectangle({
      x: margin,
      y: y2 - boxH,
      width: w2 - margin * 2,
      height: boxH,
      color: rgb(0.98, 0.99, 1),
      borderColor: slate200,
      borderWidth: 1,
    });

    p.drawText("Totaux par catégorie", {
      x: margin + 14,
      y: y2 - 24,
      size: 12,
      font: fontBold2,
      color: slate900,
    });

    let ty = y2 - 44;

    // header ligne
    p.drawText("Catégorie", { x: margin + 14, y: ty, size: 10, font: fontBold2, color: slate600 });
    p.drawText("TTC", { x: w2 - margin - 210, y: ty, size: 10, font: fontBold2, color: slate600 });
    p.drawText("HT", { x: w2 - margin - 140, y: ty, size: 10, font: fontBold2, color: slate600 });
    p.drawText("TVA", { x: w2 - margin - 70, y: ty, size: 10, font: fontBold2, color: slate600 });

    ty -= 14;

    const catsSorted = Array.from(totalsByCategory.entries()).sort((a, b) => catLabel(a[0]).localeCompare(catLabel(b[0])));
    for (const [cat, t] of catsSorted) {
      const label = catLabel(cat);
      p.drawText(label, { x: margin + 14, y: ty, size: 10, font: font2, color: slate900 });

      const ttc = chfFromCents(t.gross);
      const ht = chfFromCents(t.net);
      const tva = chfFromCents(t.vat);

      const right = (text: string, xRight: number) => {
        const tw = font2.widthOfTextAtSize(text, 10);
        p.drawText(text, { x: xRight - tw, y: ty, size: 10, font: font2, color: slate900 });
      };

      right(ttc, w2 - margin - 210 + 52);
      right(ht, w2 - margin - 140 + 52);
      right(tva, w2 - margin - 70 + 52);

      ty -= 16;
    }

    // total général
    p.drawLine({
      start: { x: margin + 14, y: ty + 8 },
      end: { x: w2 - margin - 14, y: ty + 8 },
      thickness: 1,
      color: slate200,
    });

    p.drawText("TOTAL", { x: margin + 14, y: ty - 6, size: 11, font: fontBold2, color: slate900 });

    const rightTotal = (text: string, xRight: number) => {
      const tw = fontBold2.widthOfTextAtSize(text, 11);
      p.drawText(text, { x: xRight - tw, y: ty - 6, size: 11, font: fontBold2, color: slate900 });
    };

    rightTotal(chfFromCents(grossTotal), w2 - margin - 210 + 52);
    rightTotal(chfFromCents(netTotal), w2 - margin - 140 + 52);
    rightTotal(chfFromCents(vatTotal), w2 - margin - 70 + 52);

    // Footer last page
    drawFooter();

    const bytes = await pdf2.save();

    return new NextResponse(new Uint8Array(pdf), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="achats-fournisseurs-${year}.pdf"`,
  },
});
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur PDF" }, { status: 500 });
  }
}
