import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createBillForSupplier } from "@/app/actions";
import { chf, isoDate } from "@/lib/utils";
import { Card, Container, Button, Input, Select, Table, Badge, PageTitle } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, any>;
};

function safeString(v: any) {
  return String(v ?? "").trim();
}

function parseNumberLoose(v: any) {
  const s = String(v ?? "").replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const resolved = await Promise.resolve(params);
  const id = resolved.id;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
  });

  if (!supplier) {
    return (
      <Container>
        <PageTitle title="Fournisseur" subtitle="Introuvable" />
        <Card title="Erreur">
          <div className="text-sm text-slate-700">Ce fournisseur n’existe pas.</div>
          <div className="mt-4">
            <Link className="text-sm font-semibold text-blue-700 hover:underline" href="/suppliers">
              ← Retour
            </Link>
          </div>
        </Card>
      </Container>
    );
  }

  // ✅ Wrapper Server Action compatible <form action={...}>
  async function createBillAction(formData: FormData) {
    "use server";

    const supplierId = String(formData.get("supplierId") || "");
    const number = safeString(formData.get("number")) || null;

    const issueDate = String(formData.get("issueDate") || "");
    const dueDate = String(formData.get("dueDate") || "");

    const totalTtc = parseNumberLoose(formData.get("totalTtc")); // CHF
    const vatRateBp = Number(formData.get("vatRateBp") || 810); // basis points: 810 = 8.10%

    const notes = safeString(formData.get("notes")) || null;

    await createBillForSupplier({
      supplierId,
      number,
      issueDate,
      dueDate,
      totalTtc,
      vatRateBp: Number.isFinite(vatRateBp) ? vatRateBp : 810,
      notes,
    });
  }

  // ✅ Ton modèle Bill n'a pas de champ "date" => tri par createdAt
  const bills = await prisma.bill.findMany({
    where: { supplierId: supplier.id },
    orderBy: [{ createdAt: "desc" }],
  });

  const rows = bills.map((b) => {
    const isPaid = Boolean((b as any).paid);
    const badge = isPaid ? <Badge tone="success">Payée</Badge> : <Badge tone="warning">Ouverte</Badge>;

    const displayDate = (b as any).issueDate
      ? new Date((b as any).issueDate)
      : (b as any).date
      ? new Date((b as any).date)
      : new Date((b as any).createdAt);

    const total = Number((b as any).amountGrossCents || (b as any).totalTtcCents || 0);

    return [
      <span key="d" className="whitespace-nowrap">
        {isoDate(displayDate)}
      </span>,
      <span key="n" className="font-semibold">
        {safeString((b as any).number || "—")}
      </span>,
      <span key="t" className="whitespace-nowrap">
        {chf(total)}
      </span>,
      badge,
    ];
  });

  const today = isoDate(new Date());
  const in30 = isoDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return (
    <Container>
      <PageTitle
        title={supplier.name}
        subtitle={supplier.email ? supplier.email : supplier.phone ? supplier.phone : "Fournisseur"}
        right={
          <Link href="/suppliers" className="text-sm font-semibold text-slate-900 hover:underline">
            ← Retour
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card title="Nouvelle facture fournisseur">
            <form action={createBillAction} className="mt-3 grid gap-3">
              <input type="hidden" name="supplierId" value={supplier.id} />

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">N° facture (optionnel)</div>
                <Input name="number" placeholder="ex: 2026-001" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">Date facture</div>
                  <Input name="issueDate" type="date" defaultValue={today} required />
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">Échéance</div>
                  <Input name="dueDate" type="date" defaultValue={in30} required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <div className="mb-1 text-xs font-semibold text-slate-600">Total TTC (CHF)</div>
                  <Input name="totalTtc" placeholder="ex: 120.50" required />
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">TVA</div>
                  {/* vatRateBp = basis points (8.1% = 810) */}
                  <Select name="vatRateBp" defaultValue="810">
                    <option value="0">0%</option>
                    <option value="260">2.6%</option>
                    <option value="810">8.1%</option>
                  </Select>
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">Notes (optionnel)</div>
                <Input name="notes" placeholder="ex: Peinture, matériel, etc." />
              </div>

              <Button type="submit">Créer la facture</Button>

              <div className="text-xs text-slate-500">
                Si tu veux, on pourra ensuite calculer HT/TVA côté serveur selon le taux choisi.
              </div>
            </form>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title={`Historique (${bills.length})`}>
            {bills.length === 0 ? (
              <div className="text-sm text-slate-600">Aucune facture pour le moment.</div>
            ) : (
              <Table headers={["Date", "N°", "TTC", "Statut"]} rows={rows} />
            )}
          </Card>
        </div>
      </div>
    </Container>
  );
}
