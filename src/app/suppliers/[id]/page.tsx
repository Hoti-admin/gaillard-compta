import { prisma } from "@/lib/prisma";
import { Card, Container, Button, Input, Select, Table, Badge, PageTitle } from "@/components/ui";
import { createBill } from "@/app/actions";
import { chf, isoDate } from "@/lib/utils";

export default async function SupplierDetail({ params }: { params: { id: string } }) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
    include: { bills: { orderBy: { issueDate: "desc" } } },
  });

  if (!supplier) return <Container>Fournisseur introuvable.</Container>;

  const totalGross = supplier.bills.reduce((a, b) => a + b.amountGrossCents, 0);
  const totalNet = supplier.bills.reduce((a, b) => a + b.amountNetCents, 0);
  const totalVat = supplier.bills.reduce((a, b) => a + b.amountVatCents, 0);

  return (
    <Container>
      <PageTitle
        title={supplier.name}
        subtitle="Achats (TTC/HT/TVA) + archivage PDF"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Total achats TTC">{chf(totalGross)}</Card>
        <Card title="Total achats HT">{chf(totalNet)}</Card>
        <Card title="TVA payée">{chf(totalVat)}</Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Ajouter facture achat (TVA auto)">
          <form action={createBill} className="space-y-3">
            <input type="hidden" name="supplierId" value={supplier.id} />

            <Input name="number" placeholder="N° facture (optionnel)" />

            <div className="grid grid-cols-2 gap-2">
              <Input name="issueDate" type="date" defaultValue={isoDate(new Date())} required />
              <Input name="dueDate" type="date" required />
            </div>

            <Input name="amountGross" placeholder="Montant TTC CHF (ex: 620.50)" required />

            <Select name="vatRate" defaultValue="8.1">
              <option value="0">TVA 0%</option>
              <option value="2.6">TVA 2.6%</option>
              <option value="3.8">TVA 3.8%</option>
              <option value="8.1">TVA 8.1%</option>
            </Select>

            <Input name="notes" placeholder="Note (optionnel)" />

            <Button type="submit">Ajouter</Button>
          </form>
        </Card>

        <div className="md:col-span-2">
          <Card title="Historique achats + PDF">
            <Table
              headers={["Date", "N°", "TTC", "HT", "TVA", "PDF", "Upload PDF"]}
              rows={supplier.bills.map((b) => [
                isoDate(b.issueDate),
                b.number || "—",
                chf(b.amountGrossCents),
                chf(b.amountNetCents),
                chf(b.amountVatCents),
                b.documentPath ? (
                  <div className="flex items-center gap-2">
                    <Badge tone="info">PDF</Badge>
                    <a
                      className="text-sm font-semibold text-blue-700 hover:underline"
                      href={`/api/files/signed?path=${encodeURIComponent(b.documentPath)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Télécharger
                    </a>
                  </div>
                ) : (
                  "—"
                ),
                <form
                  key={b.id}
                  action="/api/upload/pdf"
                  method="post"
                  encType="multipart/form-data"
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="type" value="bill" />
                  <input type="hidden" name="id" value={b.id} />
                  <input type="file" name="file" accept="application/pdf" required />
                  <button className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800">
                    Upload
                  </button>
                </form>,
              ])}
            />
          </Card>
        </div>
      </div>
    </Container>
  );
}
