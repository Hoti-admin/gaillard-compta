import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const yearStr = String(url.searchParams.get("year") ?? "").trim();
  const year = Number(yearStr || new Date().getFullYear());

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return new NextResponse("Invalid year", { status: 400 });
  }

  const prefix = String(year);

  // On cherche le plus grand numéro qui commence par l'année
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  // last.number = "2026008" => seq = 8 => next = 9
  let nextSeq = 1;
  if (last?.number) {
    const tail = last.number.slice(prefix.length);
    const seq = Number(tail);
    if (Number.isFinite(seq) && seq >= 0) nextSeq = seq + 1;
  }

  const nextNumber = `${prefix}${pad3(nextSeq)}`;
  return NextResponse.json({ nextNumber });
}
