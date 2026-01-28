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

  const bills = await prisma.bill.findMany({
    where: { supplierId: supplier.id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const rows = bills.map((b) => {
    const isPaid = Boolean((b as any).paid);
    const badge = isPaid ? <Badge tone="success">Payée</Badge> : <Badge tone="warning">Ouverte</Badge>;

    return [
      <span key="d" className="whitespace-nowrap">
        {isoDate(new Date((b as any).date))}
      </span>,
      <span key="n" className="font-semibold">
        {safeString((b as any).number || "—")}
      </span>,
      <span key="t" className="whitespace-nowrap">
        {chf(Number((b as any).amountGrossCents || 0))}
      </span>,
      badge,
    ];
  });

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
            <form action={createBillForSupplier} className="mt-3 grid gap-3">
              <input type="hidden" name="supplierId" value={supplier.id} />

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">N° facture</div>
                <Input name="number" placeholder="ex: 2026-001" />
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">Date</div>
                <Input name="date" type="date" defaultValue={isoDate(new Date())} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <div className="mb-1 text-xs font-semibold text-slate-600">Montant TTC (CHF)</div>
                  <Input name="amountGross" placeholder="ex: 120.50" />
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-600">TVA</div>
                  {/* ✅ PAS de prop options — on met les <option> dedans */}
                  <Select name="vatRate" defaultValue="8.1">
                    <option value="0">0%</option>
                    <option value="2.6">2.6%</option>
                    <option value="8.1">8.1%</option>
                  </Select>
                </div>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold text-slate-600">Note (optionnel)</div>
                <Input name="note" placeholder="ex: Peinture, matériel, etc." />
              </div>

              <Button type="submit">Créer la facture</Button>

              <div className="text-xs text-slate-500">
                Astuce: tu peux saisir le TTC seulement, le HT/TVA seront calculés côté serveur selon le taux.
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
