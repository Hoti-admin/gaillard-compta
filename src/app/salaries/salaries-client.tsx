"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: string; name: string; type: "EMPLOYE" | "CADRE" };
type SalaryRow = {
  id: string;
  year: number;
  month: number;
  grossCents: number;
  chargesCents: number;
  netCents: number;
  notes: string | null;
  employee: Employee;
  expense: { id: string } | null;
};

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function parseMoneyToCents(input: string) {
  const s = String(input ?? "").trim().replace("CHF", "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function SalariesClient(props: {
  year: number;
  month: number;
  employees: Employee[];
  salaries: SalaryRow[];
}) {
  const router = useRouter();

  const [empName, setEmpName] = useState("");
  const [empType, setEmpType] = useState<Employee["type"]>("EMPLOYE");

  const [employeeId, setEmployeeId] = useState(props.employees[0]?.id ?? "");
  const [gross, setGross] = useState("");
  const [charges, setCharges] = useState("");
  const [net, setNet] = useState("");
  const [notes, setNotes] = useState("");

  const list = props.salaries;

  const monthTotals = useMemo(() => {
    return list.reduce(
      (acc, s) => {
        acc.gross += s.grossCents;
        acc.charges += s.chargesCents;
        acc.net += s.netCents;
        return acc;
      },
      { gross: 0, charges: 0, net: 0 }
    );
  }, [list]);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    const name = empName.trim();
    if (!name) return alert("Nom employé manquant");

    const res = await fetch("/api/salaries/employee-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: empType }),
    });

    const json = await res.json();
    if (!res.ok) return alert(json?.error ?? "Erreur création employé");
    setEmpName("");
    router.refresh();
  }

  async function createSalary(e: React.FormEvent) {
    e.preventDefault();

    if (!employeeId) return alert("Choisis un employé");
    const grossCents = parseMoneyToCents(gross);
    const chargesCents = parseMoneyToCents(charges);
    const netCents = parseMoneyToCents(net);

    if (grossCents === null) return alert("Brut invalide");
    if (chargesCents === null) return alert("Charges invalides");
    if (netCents === null) return alert("Net invalide");

    const res = await fetch("/api/salaries/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        year: props.year,
        month: props.month,
        grossCents,
        chargesCents,
        netCents,
        notes: notes.trim() || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) return alert(json?.error ?? "Erreur création salaire");

    setGross("");
    setCharges("");
    setNet("");
    setNotes("");
    router.refresh();
  }

  async function deleteSalary(id: string) {
    if (!confirm("Supprimer ce salaire ? (la dépense liée sera supprimée aussi)")) return;

    const res = await fetch("/api/salaries/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const json = await res.json();
    if (!res.ok) return alert(json?.error ?? "Erreur suppression");
    router.refresh();
  }

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* Ajouter employé */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-extrabold text-slate-900">+ Ajouter un employé</div>
        <form onSubmit={createEmployee} className="mt-4 grid gap-3">
          <input
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            placeholder="Nom (ex: Kevin, Franco...)"
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <select
            value={empType}
            onChange={(e) => setEmpType(e.target.value as any)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="EMPLOYE">Employé</option>
            <option value="CADRE">Cadre</option>
          </select>

          <button className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Ajouter
          </button>
        </form>
      </div>

      {/* Ajouter salaire */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold text-slate-900">+ Ajouter un salaire</div>
            <div className="mt-1 text-xs text-slate-500">
              Crée automatiquement une dépense (catégorie SALAIRE_EMPLOYE / SALAIRE_CADRE)
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            Totaux mois: <b>{chf(monthTotals.gross)}</b> brut · <b>{chf(monthTotals.charges)}</b> charges ·{" "}
            <b>{chf(monthTotals.net)}</b> net
          </div>
        </div>

        <form onSubmit={createSalary} className="mt-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-600 mb-1">Employé</div>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {props.employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.type === "CADRE" ? "Cadre" : "Employé"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Brut</div>
            <input
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              placeholder="ex: 5200"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Charges</div>
            <input
              value={charges}
              onChange={(e) => setCharges(e.target.value)}
              placeholder="ex: 1200"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1">Net</div>
            <input
              value={net}
              onChange={(e) => setNet(e.target.value)}
              placeholder="ex: 4300"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-6">
            <div className="text-xs font-semibold text-slate-600 mb-1">Notes (optionnel)</div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: 13ème salaire, acompte, prime..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-6">
            <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Enregistrer salaire
            </button>
          </div>
        </form>

        {/* Table */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Employé</th>
                <th className="px-3 py-2 text-right">Brut</th>
                <th className="px-3 py-2 text-right">Charges</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2 text-left">Lien dépense</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((s) => (
                  <tr key={s.id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {s.employee.name}
                      <div className="text-xs font-normal text-slate-500">
                        {s.employee.type === "CADRE" ? "Cadre" : "Employé"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{chf(s.grossCents)}</td>
                    <td className="px-3 py-2 text-right">{chf(s.chargesCents)}</td>
                    <td className="px-3 py-2 text-right">{chf(s.netCents)}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {s.expense ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          OK (Expense)
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteSalary(s.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-slate-500">
                    Aucun salaire enregistré pour ce mois.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          * La dépense liée = Brut + Charges, TVA = 0.
        </div>
      </div>
    </div>
  );
}
