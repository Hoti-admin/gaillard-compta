import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

/* =========================
   SERVER ACTION
========================= */
async function createSalary(formData: FormData): Promise<void> {
  "use server";

  const employee = String(formData.get("employee") ?? "").trim();
  const month = String(formData.get("month") ?? "");
  const amount = Number(formData.get("amount"));

  if (!employee) {
    throw new Error("Employé manquant");
  }
  if (!month) {
    throw new Error("Mois manquant");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Montant invalide");
  }

  await prisma.salary.create({
    data: {
      employee,
      month,
      amountCents: Math.round(amount * 100),
    },
  });
}

/* =========================
   PAGE
========================= */
export default async function SalariesPage() {
  const salaries = await prisma.salary.findMany({
    orderBy: [{ month: "desc" }, { employee: "asc" }],
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="text-3xl font-extrabold tracking-tight text-slate-900">
        Salaires
      </div>
      <div className="mt-1 text-sm text-slate-600">
        Gestion des salaires par employé et par mois
      </div>

      {/* ➕ Ajouter salaire */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-extrabold text-slate-900">
          + Ajouter un salaire
        </div>

        <form action={createSalary} className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            name="employee"
            placeholder="Nom employé"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />

          <input
            name="month"
            type="month"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />

          <input
            name="amount"
            type="number"
            step="0.01"
            placeholder="Salaire CHF"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            required
          />

          <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Enregistrer
          </button>
        </form>
      </div>

      {/* 📋 Liste */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Employé</th>
              <th className="px-3 py-2 text-left">Mois</th>
              <th className="px-3 py-2 text-right">Salaire</th>
            </tr>
          </thead>
          <tbody>
            {salaries.length ? (
              salaries.map((s) => (
                <tr key={s.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-semibold text-slate-900">
                    {s.employee}
                  </td>
                  <td className="px-3 py-2">{s.month}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {chf(s.amountCents)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-slate-500">
                  Aucun salaire enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
