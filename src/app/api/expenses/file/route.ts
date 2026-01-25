import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const path = String(searchParams.get("path") || "").trim();
    const download = String(searchParams.get("download") || "0") === "1";

    if (!path) {
      return NextResponse.json({ error: "Paramètre 'path' manquant" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // ✅ signed url 60 secondes
    const { data, error } = await supabase.storage.from("expenses").createSignedUrl(path, 60, {
      download: download ? path.split("/").pop() || "justificatif" : undefined,
    });

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Impossible de générer l'URL" }, { status: 400 });
    }

    // Redirect vers le fichier (ouvre ou télécharge)
    return NextResponse.redirect(data.signedUrl, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 500 });
  }
}
