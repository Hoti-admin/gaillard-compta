import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const number = String(body?.number ?? "").trim();
  const clientId = String(body?.clientId ?? "").trim();

  if (!number) return new NextResponse("Missing number", { status: 400 });
  if (!clientId) return new NextResponse("Missing clientId", { status: 400 });

  const issueDate = new Date(String(body?.issueDate));
  const dueDate = new Date(String(body?.dueDate));
  if (Number.isNaN(issueDate.getTime())) return new NextResponse("Invalid issueDate", { status: 400 });
  if (Number.isNaN(dueDate.getTime())) return new NextResponse("Invalid dueDate", { status: 400 });

  const vatRateBp = Number(body?.vatRateBp ?? 810);
  const amountGrossCents = Number(body?.amountGrossCents);
  const amountNetCents = Number(body?.amountNetCents);
  const amountVatCents = Number(body?.amountVatCents);

  if (!Number.isFinite(amountGrossCents) || amountGrossCents <= 0)
    return new NextResponse("Invalid amountGrossCents", { status: 400 });

  if (!Number.isFinite(amountNetCents) || amountNetCents < 0)
    return new NextResponse("Invalid amountNetCents", { status: 400 });

  if (!Number.isFinite(amountVatCents) || amountVatCents < 0)
    return new NextResponse("Invalid amountVatCents", { status: 400 });

  const projectName = body?.projectName ? String(body.projectName) : null;

  const created = await prisma.invoice.create({
    data: {
      number,
      clientId,
      issueDate,
      dueDate,
      projectName,
      vatRateBp,
      amountGrossCents,
      amountNetCents,
      amountVatCents,
      status: "OPEN",
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
