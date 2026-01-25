import { prisma } from "@/lib/prisma";
import { Container, PageTitle, Card, Table, ButtonGhost, Select } from "@/components/ui";
import { chf } from "@/lib/utils";

export default async function PurchasesReport({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const now = new Date();
  const currentYear = now.getFullYear();
  const year = Number(sp.year || currentYear);

  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const bills = await prisma.bill.findMany({
    where: { issueDate: { gte: from, lt: to }, status: { not: "CANCELED" } },
    include: { supplier: true },
    take: 100000,
  });

  const map = new Map<string, { name: string; gross: number; net: number; vat: number }>();
  for (const b of bills) {
    const cur = map.get(b.supplierId) || { name: b.supplier.name, gross: 0, net: 0, vat: 0 };
    cur.gross += b.amountGrossCents;
    cur.net += b.amountNetCents;
    cur.vat += b.amountVatCents;
    map.set(b.supplierId, cur);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.gross - a.gross);

  const totalGross = rows.reduce((a, r) => a + r.gross, 0);
  const totalNet = rows.reduce((a, r) => a + r.net, 0);
  const totalVat = rows.reduce((a, r) => a + r.vat, 0);

  const years = [currentYear, currentYear - 1, currentYear - 2];

  const excelUrl = `/api/export/purchases.xlsx?year=${year}`;
  const pdfUrl = `/api/export/purchases.pdf?year=${year}`;

  return (
    <Container>
      <PageTitle
        title="Rapport achats"
        subtitle={`Année ${year} — Total TTC: ${chf(totalGross)} · HT: ${chf(totalNet)} · TVA payée: ${chf(totalVat)}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <form action="/reports/purchases" method="get" className="flex items-center gap-2">
              <Select name="year" defaultValue={String(year)} className="w-28">
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </Select>
              <ButtonGhost type="submit">Appliquer</ButtonGhost>
            </form>

            <a href={excelUrl}>
              <ButtonGhost type="button">Export Excel</ButtonGhost>
            </a>
            <a href={pdfUrl}>
              <ButtonGhost type="button">Export PDF</ButtonGhost>
            </a>
          </div>
        }
      />

      <Card title="Détail par fournisseur (TTC / HT / TVA)">
        <Table
          headers={["Fournisseur", "Total TTC", "Total HT", "TVA payée"]}
          rows={rows.map((r) => [r.name, chf(r.gross), chf(r.net), chf(r.vat)])}
        />
      </Card>
    </Container>
  );
}
