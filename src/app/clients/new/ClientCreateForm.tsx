"use client";

import { useState } from "react";

export default function ClientCreateForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/clients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Erreur création client");
      }

      window.location.href = "/clients";
    } catch (err: any) {
      alert(err?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-600">Nom *</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2"
          required
          placeholder="Ex: BD Gérance SA"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="ex: contact@..."
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-600">Téléphone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="079..."
          />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-semibold text-slate-600">Adresse</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Rue / NPA / Ville"
        />
      </label>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? "Création..." : "Créer le client"}
        </button>
      </div>
    </form>
  );
}
