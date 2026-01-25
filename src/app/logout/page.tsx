"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.signOut().finally(() => {
      router.replace("/login");
      router.refresh();
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 text-slate-700">
        Déconnexion…
      </div>
    </div>
  );
}
