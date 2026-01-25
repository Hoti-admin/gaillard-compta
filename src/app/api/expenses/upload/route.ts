import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const expenseId = String(form.get("expenseId") || "").trim(); // requis ici

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier (champ 'file')" }, { status: 400 });
    }
    if (!expenseId) {
      return NextResponse.json({ error: "expenseId manquant" }, { status: 400 });
    }

    // On vérifie que la dépense existe
    const exp = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!exp) return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });

    const supabase = supabaseAdmin();

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `receipts/${expenseId}/${Date.now()}-${safeName(file.name)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: upErr } = await supabase.storage.from("expenses").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    // ✅ Si un ancien fichier existe, on le supprime
    if (exp.receiptPath) {
      await supabase.storage.from("expenses").remove([exp.receiptPath]).catch(() => {});
    }

    // ✅ On enregistre le chemin dans Prisma
    await prisma.expense.update({
      where: { id: expenseId },
      data: { receiptPath: path },
    });

    revalidatePath("/expenses");
    return NextResponse.json({ ok: true, receiptPath: path });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur upload" }, { status: 500 });
  }
}
