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
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (error) setMsg(error);
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      // redirige où tu veux après login
      router.push(nextUrl);
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    if (!email) {
      setMsg("Entre ton email d’abord, puis clique sur Mot de passe oublié.");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      // lien de reset (à toi de créer /auth/reset si tu veux une belle page)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      });

      if (error) setMsg(error.message);
      else setMsg("Email de réinitialisation envoyé ✅ (regarde aussi les spams).");
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
        <div className="mt-2 text-sm text-slate-600">Connecte-toi avec ton email et ton mot de passe.</div>

        {msg ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {msg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-5 grid gap-3">
          <label className="text-xs font-semibold text-slate-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: hoti@jpgpeinture.ch"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <label className="text-xs font-semibold text-slate-600">Mot de passe</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

          <button
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onForgotPassword}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Mot de passe oublié
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Retour
          </button>

          <div className="pt-2 text-xs text-slate-500">
            Redirection après login : <span className="font-semibold">{nextUrl}</span>
          </div>
        </form>
      </div>
    </div>
  );
}
