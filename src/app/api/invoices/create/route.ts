import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function parseMoneyToCents(input: unknown): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }

  if (typeof input === "string") {
    let s = input.trim();

    // enlève CHF et texte
    s = s.replace(/chf/gi, "").trim();

    // enlève espaces et séparateurs de milliers
    s = s.replace(/\s+/g, "").replace(/'/g, "");

    // virgule -> point
    s = s.replace(",", ".");

    // garde chiffres + point + signe
    s = s.replace(/[^0-9.-]/g, "");

    const n = Number(s);
    if (!Number.isFinite(n)) return null;

    return Math.round(n * 100);
  }

  return null;
}

function pickGrossCents(body: any): { grossCents: number | null; pickedFrom: string } {
  // 1) cents direct (déjà en centimes)
  const centsKeys = ["amountGrossCents", "grossCents", "ttcCents", "montantTtcCents"];
  for (const k of centsKeys) {
    const v = body?.[k];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return { grossCents: Math.round(v), pickedFrom: k };
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return { grossCents: Math.round(n), pickedFrom: k };
    }
  }

  // 2) montant en CHF (string/number)
  const chfKeys = ["amountGross", "amount", "ttc", "montantTtc", "amountGrossChf", "amountGrossCHF"];
  for (const k of chfKeys) {
    const v = body?.[k];
    const cents = parseMoneyToCents(v);
    if (cents && cents > 0) return { grossCents: cents, pickedFrom: k };
  }

  // 3) nested éventuellement
  const nested = body?.data ?? body?.payload ?? null;
  if (nested) {
    for (const k of [...centsKeys, ...chfKeys]) {
      const v = nested?.[k];
      const cents =
        centsKeys.includes(k)
          ? (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : Number.isFinite(Number(v)) ? Math.round(Number(v)) : null)
          : parseMoneyToCents(v);

      if (cents && cents > 0) return { grossCents: cents, pickedFrom: `nested:${k}` };
    }
  }

  return { grossCents: null, pickedFrom: "none" };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const clientId = body?.clientId ?? body?.data?.clientId ?? body?.payload?.clientId;
    const number = body?.number ?? body?.data?.number ?? body?.payload?.number;
    const issueDate = body?.issueDate ?? body?.data?.issueDate ?? body?.payload?.issueDate;
    const dueDate = body?.dueDate ?? body?.data?.dueDate ?? body?.payload?.dueDate;

    const vatRateBpRaw = body?.vatRateBp ?? body?.tvaBp ?? body?.vatBp ?? body?.data?.vatRateBp ?? body?.payload?.vatRateBp ?? 810;
    const vatBp = Number(vatRateBpRaw);

    const { grossCents, pickedFrom } = pickGrossCents(body);

    // ✅ DEBUG TEMPORAIRE : si invalide, on renvoie le payload reçu
    if (!grossCents || grossCents <= 0) {
      return NextResponse.json(
        {
          error: "Montant TTC invalide",
          debug: {
            pickedFrom,
            receivedKeys: Object.keys(body ?? {}),
            receivedBody: body,
          },
        },
        { status: 400 }
      );
    }

    if (!clientId || !number || !issueDate || !dueDate) {
      return NextResponse.json(
        {
          error: "Champs manquants",
          debug: { clientId, number, issueDate, dueDate, receivedBody: body },
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(vatBp) || vatBp < 0 || vatBp > 5000) {
      return NextResponse.json({ error: "TVA invalide", debug: { vatRateBpRaw } }, { status: 400 });
    }

    // TVA incluse : TVA = TTC * taux / (100% + taux)
    const vatCents = Math.round((grossCents * vatBp) / (10000 + vatBp));
    const netCents = grossCents - vatCents;

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        number,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),

        amountGrossCents: grossCents,
        amountNetCents: netCents,
        amountVatCents: vatCents,
        vatRateBp: vatBp,

        status: "OPEN",
      },
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    console.error("CREATE INVOICE ERROR", err);
    return NextResponse.json({ error: "Erreur serveur création facture" }, { status: 500 });
  }
}
