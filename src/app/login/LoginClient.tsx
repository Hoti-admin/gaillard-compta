"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/client";

function safeNextUrl(nextParam: string | null) {
  if (!nextParam) return "/";

  let next = nextParam;
  try {
    next = decodeURIComponent(nextParam);
  } catch {
    // ignore
  }

  // Doit être un chemin interne (évite open-redirect)
  if (!next.startsWith("/")) return "/";

  // Bloque la boucle "login -> logout"
  if (next === "/logout" || next.startsWith("/logout?") || next.startsWith("/logout/")) return "/";

  // Optionnel: évite les chemins bizarres
  if (next.includes("\n") || next.includes("\r")) return "/";

  return next || "/";
}

function friendlySupabaseError(msg: string) {
  const m = msg.toLowerCase();

  if (m.includes("rate limit")) {
    return "Trop de demandes d’email. Attends 1–2 minutes et réessaie (ou check tes spams, le lien est peut-être déjà arrivé).";
  }
  if (m.includes("invalid email")) {
    return "Email invalide. Vérifie l’adresse.";
  }
  if (m.includes("email not confirmed")) {
    return "Ton email n’est pas confirmé. Regarde si tu as déjà reçu un lien de confirmation.";
  }
  return msg;
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const nextUrl = useMemo(() => safeNextUrl(searchParams.get("next")), [searchParams]);
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Cooldown anti-spam (en secondes)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (error) setMsg(error);
  }, [error]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Si l’utilisateur modifie l’email, on reset l’état "sent"
  useEffect(() => {
    if (sent) setSent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;
    if (cooldown > 0) return;

    setLoading(true);
    setMsg(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setMsg(friendlySupabaseError(error.message));
        // petit cooldown même en erreur pour éviter spam
        setCooldown(20);
      } else {
        setSent(true);
        setCooldown(60); // 60s avant de pouvoir renvoyer
      }
    } catch (err: any) {
      setMsg(err?.message || "Erreur");
      setCooldown(20);
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
            {cooldown > 0 ? (
              <div className="mt-2 text-xs text-emerald-900/70">
                Tu pourras renvoyer un lien dans {cooldown}s.
              </div>
            ) : null}
          </div>
        ) : (
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

            <button
              disabled={loading || cooldown > 0}
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Envoi…" : cooldown > 0 ? `Attends ${cooldown}s…` : "Envoyer le lien"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Retour
            </button>

            {/* Petit debug utile (tu peux enlever après) */}
            <div className="pt-2 text-[11px] text-slate-400">
              Redirection après login : <span className="font-mono">{nextUrl}</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
