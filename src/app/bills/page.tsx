import { prisma } from "@/lib/prisma";
import { Container, PageTitle, Card, Table, A, Input, Select, ButtonGhost, Badge } from "@/components/ui";
import { chf, isoDate } from "@/lib/utils";

export default async function BillsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; year?: string; status?: string; sort?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = (sp.q || "").trim();
  const status = sp.status || "all"; // all | OPEN | PAID | CANCELED
  const sort = sp.sort || "date_desc";
  const now = new Date();
  const currentYear = now.getFullYear();
  const year = Number(sp.year || currentYear);

  const from = new Date(`${year}-01-01T00:00:00.000Z`);
  const to = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const orderBy =
    sort === "date_asc" ? ({ issueDate: "asc" } as const) : ({ issueDate: "desc" } as const);

  const bills = await prisma.bill.findMany({
    where: {
      issueDate: { gte: from, lt: to },
      ...(status !== "all" ? { status: status as any } : {}),
      ...(q
        ? {
            supplier: { name: { contains: q, mode: "insensitive" as const } },
          }
        : {}),
    },
    include: { supplier: true },
    orderBy,
    take: 100000,
  });

  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <Container>
      <PageTitle
        title="Achats (factures fournisseurs)"
        subtitle="Recherche + filtres (année / statut) + PDF."
        right={
          <form action="/bills" method="get" className="flex flex-wrap items-center gap-2">
            <Input name="q" defaultValue={q} placeholder="Fournisseur…" className="w-56" />
            <Select name="year" defaultValue={String(year)} className="w-28">
              {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </Select>
            <Select name="status" defaultValue={status} className="w-36">
              <option value="all">Tous</option>
              <option value="OPEN">OPEN</option>
              <option value="PAID">PAID</option>
              <option value="CANCELED">CANCELED</option>
            </Select>
            <Select name="sort" defaultValue={sort} className="w-36">
              <option value="date_desc">Date ↓</option>
              <option value="date_asc">Date ↑</option>
            </Select>
            <ButtonGhost type="submit">Appliquer</ButtonGhost>
            <a href="/bills" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Reset
            </a>
          </form>
        }
      />

      <Card title={`Résultats: ${bills.length}`}>
        <Table
          headers={["Date", "Fournisseur", "N°", "TTC", "HT", "TVA", "PDF"]}
          rows={bills.map((b) => [
            isoDate(b.issueDate),
            <A key={b.id} href={`/suppliers/${b.supplierId}`}>{b.supplier.name}</A>,
            b.number || "—",
            chf(b.amountGrossCents),
            chf(b.amountNetCents),
            chf(b.amountVatCents),
            b.documentPath ? (
              <span className="flex items-center gap-2">
                <Badge tone="info">PDF</Badge>
                <a
                  className="text-sm font-semibold text-blue-700 hover:underline"
                  href={`/api/files/signed?path=${encodeURIComponent(b.documentPath)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Télécharger
                </a>
              </span>
            ) : "—",
          ])}
        />
      </Card>
    </Container>
  );
}
