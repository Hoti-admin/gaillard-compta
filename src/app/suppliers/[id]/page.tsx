import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, Container, Button, Input, Select, Table, Badge, PageTitle } from "@/components/ui";
import { createBillForSupplier } from "@/app/actions";
import { chf, isoDate } from "@/lib/utils";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, any>;
};

export default async function SupplierDetail(props: PageProps) {
  const params = await Promise.resolve(props.params);
  const id = params?.id;
  if (!id) return notFound();

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      bills: { include: { payments: true }, orderBy: { dueDate: "desc" } },
    },
  });

  if (!supplier) return notFound();

  return (
    <Container>
      <div className="flex items-start justify-between gap-3">
        <div>
          <PageTitle title={supplier.name} subtitle="Détail fournisseur + achats" />
          <div className="mt-1 text-sm text-slate-600">
            {supplier.email || "—"} · {supplier.phone || "—"}
          </div>
        </div>

        <Link
          href="/suppliers"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Retour fournisseurs
        </Link>
      </div>

      {/* Création achat (server action) */}
      <Card className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-bold text-slate-900">Nouvel achat (facture fournisseur)</div>
          <Badge tone="neutral">TVA auto</Badge>
        </div>

        <form action={createBillForSupplier} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
          <input type="hidden" name="supplierId" value={supplier.id} />

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">N° facture</div>
            <Input name="number" placeholder="ex: F-2026-001 (optionnel)" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Date facture</div>
            <Input name="issueDate" type="date" defaultValue={isoDate(new Date())} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Échéance</div>
            <Input name="dueDate" type="date" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Montant TTC (CHF)</div>
            <Input name="totalTtc" type="number" step="0.01" placeholder="0.00" required />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">TVA %</div>
            <Select
              name="tvaRate"
              defaultValue="8.1"
              options={[
                { value: "0", label: "0%" },
                { value: "2.6", label: "2.6%" },
                { value: "8.1", label: "8.1%" },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Note (optionnel)</div>
            <Input name="notes" placeholder="ex: Parking, Restaurant, etc." />
          </div>

          <div className="md:col-span-6 mt-2 flex gap-2">
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Card>

      {/* Liste achats */}
      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold text-slate-900">Achats</div>
          <Badge tone="neutral">{supplier.bills.length} pièce(s)</Badge>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table
            headers={["N°", "Date", "Échéance", "TTC", "Payé", "Solde", "Statut"]}
            rows={supplier.bills.map((b) => {
              const paid = b.payments.reduce((s, p) => s + p.amountCents, 0) / 100;
              const total = b.amountGrossCents / 100;
              const balance = total - paid;

              const tone =
                balance <= 0 ? "success" : paid > 0 ? "warning" : "danger";
              const label =
                balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "OPEN";

              return [
                b.number || "—",
                isoDate(b.issueDate),
                isoDate(b.dueDate),
                chf(total),
                chf(paid),
                chf(balance),
                <Badge key={b.id} tone={tone as any}>
                  {label}
                </Badge>,
              ];
            })}
          />
        </div>
      </Card>
    </Container>
  );
}
