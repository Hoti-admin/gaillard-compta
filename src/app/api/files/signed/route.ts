import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "documents";

  // URL signée valable 2 minutes
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 120);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: error?.message || "Cannot sign URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
