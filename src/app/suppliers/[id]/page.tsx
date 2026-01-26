import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createBillForSupplier } from "@/app/actions";
import { chf, isoDate } from "@/lib/utils";
import { Card, Container, Button, Input, Select, Table, Badge, PageTitle } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
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

  // ✅ Wrapper "use server" pour convertir FormData -> objet
  async function createBillAction(formData: FormData) {
    "use server";

    const supplierId = String(formData.get("supplierId") || "");
    const number = String(formData.get("number") || "").trim() || null;
    const issueDate = String(formData.get("issueDate") || "");
    const dueDate = String(formData.get("dueDate") || "");
    const totalTtc = Number(String(formData.get("totalTtc") || "0").replace(",", "."));
    const vatRate = Number(String(formData.get("vatRate") || "8.1").replace(",", "."));
    const notes = String(formData.get("notes") || "").trim() || null;

    // vatRateBp attendu (810 = 8.1%)
    const vatRateBp = Math.round(vatRate * 100);

    await createBillForSupplier({
      supplierId,
      number,
      issueDate,
      dueDate,
      totalTtc,
      vatRateBp,
      notes,
    });

    revalidatePath(`/suppliers/${supplierId}`);
  }

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

      {/* ✅ Création achat */}
      <Card className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-bold text-slate-900">Nouvel achat</div>
          <Badge tone="neutral">TVA auto</Badge>
        </div>

        <form action={createBillAction} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-6">
          <input type="hidden" name="supplierId" value={supplier.id} />

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">N° facture</div>
            <Input name="number" placeholder="optionnel" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Date facture</div>
            <Input name="issueDate" type="date" defaultValue={isoDate(new Date())} required />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Échéance</div>
            <Input name="dueDate" type="date" required />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Montant TTC (CHF)</div>
            <Input name="totalTtc" type="number" step="0.01" placeholder="0.00" required />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">TVA %</div>
            <Select
              name="vatRate"
              defaultValue="8.1"
              options={[
                { value: "0", label: "0%" },
                { value: "2.6", label: "2.6%" },
                { value: "8.1", label: "8.1%" },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-1">Notes</div>
            <Input name="notes" placeholder="optionnel" />
          </div>

          <div className="md:col-span-6 mt-2 flex gap-2">
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Card>

      {/* ✅ Liste achats */}
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

              const tone = balance <= 0 ? "success" : paid > 0 ? "warning" : "danger";
              const label = balance <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "OPEN";

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
