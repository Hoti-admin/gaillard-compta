"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/client";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const nextUrl = searchParams.get("next") || "/";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (error) setMsg(error);
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      });

      if (error) setMsg(error.message);
      else setSent(true);
    } catch (err: any) {
      setMsg(err?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">Connexion</div>
        <div className="mt-2 text-sm text-slate-600">Entre ton email pour recevoir un lien magique.</div>

        {msg ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {msg}
          </div>
        ) : null}

        {sent ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Email envoyé ✅ Regarde ta boîte mail (et les spams).
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 grid gap-3">
            <label className="text-xs font-semibold text-slate-600">Email</label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: hoti@gaillard.ch"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <button
              disabled={loading}
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
