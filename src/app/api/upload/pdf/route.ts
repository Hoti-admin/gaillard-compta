import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function safeReturnTo(value: string | null) {
  if (!value) return null;
  const v = String(value).trim();
  // sécurité: on accepte uniquement les chemins internes
  if (!v.startsWith("/")) return null;
  return v;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = String(form.get("type") || "bill"); // bill | invoice
  const id = String(form.get("id") || "");
  const returnTo = safeReturnTo(form.get("returnTo") as string | null);

  if (!file || !id) {
    return NextResponse.json({ ok: false, error: "Fichier ou ID manquant" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ ok: false, error: "PDF uniquement" }, { status: 400 });
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";

  const cleanName = file.name.replaceAll(" ", "_");
  const storagePath = `${type}/${id}/${Date.now()}-${cleanName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(storagePath, arrayBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Save + redirect
  if (type === "bill") {
    const bill = await prisma.bill.update({
      where: { id },
      data: { documentPath: storagePath },
      select: { supplierId: true },
    });

    const target = returnTo || `/suppliers/${bill.supplierId}`;
    return NextResponse.redirect(new URL(target, req.url));
  } else {
    const inv = await prisma.invoice.update({
      where: { id },
      data: { documentPath: storagePath },
      select: { clientId: true },
    });

    const target = returnTo || `/clients/${inv.clientId}`;
    return NextResponse.redirect(new URL(target, req.url));
  }
}
