"use client";

import { useState } from "react";

type Payload = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

function cleanOptional(v: string) {
  const x = v.trim();
  return x.length ? x : undefined;
}

export default function ClientFormClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload: Payload = {
      name: name.trim(),
      email: cleanOptional(email),
      phone: cleanOptional(phone),
      address: cleanOptional(address),
    };

    if (!payload.name) {
      alert("Le nom est obligatoire.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/clients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? "Erreur lors de la création du client.");
        return;
      }

      // redirection vers la liste
      window.location.href = "/clients";
    } catch (err: any) {
      alert(err?.message ?? "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-600">
            Nom <span className="text-rose-600">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Ville de Fribourg"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: contact@..."
            type="email"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Téléphone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="079..."
            type="tel"
            inputMode="tel"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <div className="mt-1 text-xs text-slate-500">
            Astuce : laisse en texte (pas number) pour garder le 0 au début.
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-600">Adresse</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rue, N°, NPA Ville"
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <a
          href="/clients"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Annuler
        </a>

        <button
          disabled={loading}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Création..." : "Créer le client"}
        </button>
      </div>
    </form>
  );
}
