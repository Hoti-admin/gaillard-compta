import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function chf(cents: number) {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function ym(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function createSalary(formData: FormData): Promise<void> {
  "use server";

  const employee = String(formData.get("employee") ?? "").trim();
  const month = String(formData.get("month") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();

  if (!employee) throw new Error("Nom employé manquant");
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Mois invalide (YYYY-MM)");

  // accepte "5200", "5200.50", "5'200.50", "5 200.50"
  const normalized = amount.replace(/['\s]/g, "").replace(",", ".");
  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Montant invalide");
  }

  const amountCents = Math.round(value * 100);

  // Upsert: si même (employee, month) existe, on remplace
  await prisma.salary.upsert({
    where: { employee_month: { employee, month } },
    update: { amountCents },
    create: { employee, month, amountCents },
  });

  revalidatePath("/salaries");
}

async function deleteSalary(formData: FormData): Promise<void> {
  "use server";

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.salary.delete({ where: { id } });
  revalidatePath("/salaries");
}

export default async function SalariesPage(props: { searchParams?: Promise<any> }) {
  const sp = (await props.searchParams) ?? {};
  const month = String(sp.month ?? ym());

  let salaries: Array<{
    id: string;
    employee: string;
    month: string;
    amountCents: number;
    createdAt: Date;
  }> = [];

  let dbError: string | null = null;

  try {
    salaries = await prisma.salary.findMany({
      where: { month },
      orderBy: [{ employee: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        employee: true,
        month: true,
        amountCents: true,
        createdAt: true,
      },
    });
  } catch (e: any) {
    // si table pas créée / schema pas appliqué
    dbError =
      e?.message?.includes("does not exist") || e?.code === "P2021"
        ? "La table Salary n’existe pas encore dans la base. Exécute le SQL de création dans Supabase."
        : "Erreur serveur côté base de données (voir logs Vercel).";
  }

  const totalCents = salaries.reduce((s, x) => s + x.amountCents, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-900">Salaires</div>
          <div className="mt-1 text-sm text-slate-600">Ajouter un salaire par employé et par mois.</div>
        </div>

        <form className="flex items-center gap-2">
          <input
            name="month"
            type="month"
            defaultValue={month}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Filtrer
          </button>
        </form>
      </div>

      {dbError ? (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
          <div className="font-extrabold">Problème base de données</div>
          <div className="mt-1">{dbError}</div>
          <div className="mt-2 text-xs text-rose-800">
            Astuce : Supabase → SQL Editor → exécuter le script CREATE TABLE Salary.
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-extrabold text-slate-900">+ Ajouter / modifier</div>

          <form action={createSalary} className="mt-4 grid gap-3">
            <input
              name="employee"
              placeholder="Nom employé (ex: Franco)"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />

            <input
              name="month"
              type="month"
              defaultValue={month}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />

            <input
              name="amount"
              placeholder="Salaire CHF (ex: 5200 ou 5200.50)"
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              required
            />

            <button className="rounded-2xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              Enregistrer
            </button>

            <div className="text-xs text-slate-500">
              * Si l’employé existe déjà pour ce mois, le montant est remplacé.
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Liste ({month})</div>
              <div className="mt-1 text-xs text-slate-500">Total mois : {chf(totalCents)}</div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Employé</th>
                  <th className="px-3 py-2 text-right">Salaire</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {salaries.length ? (
                  salaries.map((s) => (
                    <tr key={s.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{s.employee}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{chf(s.amountCents)}</td>
                      <td className="px-3 py-2 text-right">
                        <form action={deleteSalary}>
                          <input type="hidden" name="id" value={s.id} />
                          <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100">
                            Supprimer
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-slate-500">
                      Aucun salaire pour ce mois.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Astuce : utilise le filtre mois en haut pour naviguer.
          </div>
        </div>
      </div>
    </div>
  );
}
