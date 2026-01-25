import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();

    if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

    const exp = await prisma.expense.findUnique({ where: { id } });
    if (!exp) return NextResponse.json({ error: "Dépense introuvable" }, { status: 404 });

    const supabase = supabaseAdmin();

    if (exp.receiptPath) {
      await supabase.storage.from("expenses").remove([exp.receiptPath]).catch(() => {});
    }

    await prisma.expense.delete({ where: { id } });

    revalidatePath("/expenses");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur suppression" }, { status: 500 });
  }
}
