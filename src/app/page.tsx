import { prisma } from "@/lib/prisma";
import { chf, daysLate, sumPaidCents } from "@/lib/utils";
import { Container, PageTitle, Stat, Card, Table, A, Badge, Select, ButtonGhost } from "@/components/ui";

export default async function Home({
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

  // Factures (toutes pour les retards)
  const invoicesAll = await prisma.invoice.findMany({
    where: { status: { not: "CANCELED" } },
    include: { client: true, payments: true },
    orderBy: { dueDate: "asc" },
    take: 5000,
  });

  // Factures de l'année (pour CA)
  const invoicesYear = invoicesAll.filter((i) => i.issueDate >= from && i.issueDate < to);

  const invRows = invoicesAll.map((i) => {
    const paid = sumPaidCents(i.payments);
    const outstanding = Math.max(0, i.amountGrossCents - paid);
    const late = daysLate(i.dueDate, outstanding, now);
    return { ...i, paid, outstanding, late, isLate: late > 0 && outstanding > 0 };
  });

  const ar = invRows.reduce((a, r) => a + r.outstanding, 0);
  const arLate = invRows.reduce((a, r) => a + (r.isLate ? r.outstanding : 0), 0);

  // TOP 10 retards (montant)
  const byLateClient = new Map<string, { clientId: string; name: string; lateCents: number; maxLate: number }>();
  for (const r of invRows) {
    if (!r.isLate) continue;
    const cur = byLateClient.get(r.clientId) || {
      clientId: r.clientId,
      name: r.client.name,
      lateCents: 0,
      maxLate: 0,
    };
    cur.lateCents += r.outstanding;
    cur.maxLate = Math.max(cur.maxLate, r.late);
    byLateClient.set(r.clientId, cur);
  }
  const topRetards = Array.from(byLateClient.values()).sort((a, b) => b.lateCents - a.lateCents).slice(0, 10);

  // TOP 10 CA clients sur l'année (TTC facturé)
  const byTurnover = new Map<string, { clientId: string; name: string; gross: number; vat: number }>();
  for (const i of invoicesYear) {
    const cur = byTurnover.get(i.clientId) || { clientId: i.clientId, name: i.client.name, gross: 0, vat: 0 };
    cur.gross += i.amountGrossCents;
    cur.vat += i.amountVatCents;
    byTurnover.set(i.clientId, cur);
  }
  const topCA = Array.from(byTurnover.values()).sort((a, b) => b.gross - a.gross).slice(0, 10);

  const yearGross = invoicesYear.reduce((a, i) => a + i.amountGrossCents, 0);
  const yearVat = invoicesYear.reduce((a, i) => a + i.amountVatCents, 0);

  // Achats année (TTC + TVA payée)
  const billsYear = await prisma.bill.findMany({
    where: { issueDate: { gte: from, lt: to }, status: { not: "CANCELED" } },
    include: { supplier: true },
    take: 10000,
  });

  const purchasesGross = billsYear.reduce((a, b) => a + b.amountGrossCents, 0);
  const purchasesVat = billsYear.reduce((a, b) => a + b.amountVatCents, 0);

  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <Container>
      <PageTitle
        title="Dashboard"
        subtitle={`Vue d’ensemble (filtre année : ${year})`}
        right={
          <form action="/" method="get" className="flex items-center gap-2">
            <Select name="year" defaultValue={String(year)} className="w-32">
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </Select>
            <ButtonGhost type="submit">Appliquer</ButtonGhost>
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Encours clients (à encaisser)" value={chf(ar)} sub={`En retard: ${chf(arLate)}`} />
        <Stat label={`CA clients (TTC) ${year}`} value={chf(yearGross)} sub={`TVA facturée: ${chf(yearVat)}`} />
        <Stat label={`Achats (TTC) ${year}`} value={chf(purchasesGross)} sub={`TVA payée: ${chf(purchasesVat)}`} />
        <Stat label="Factures en retard" value={`${invRows.filter((r) => r.isLate).length}`} sub="Basé sur l’échéance" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={`Top 10 clients (CA TTC) – ${year}`}>
          <Table
            headers={["Client", "CA TTC", "TVA"]}
            rows={topCA.map((c) => [
              <A key={c.clientId} href={`/clients/${c.clientId}`}>
                {c.name}
              </A>,
              <span className="font-semibold text-slate-900">{chf(c.gross)}</span>,
              chf(c.vat),
            ])}
          />
        </Card>

        <Card title="Top 10 clients en retard (montant)">
          <Table
            headers={["Client", "Montant en retard", "Jours max"]}
            rows={topRetards.map((c) => [
              <A key={c.clientId} href={`/clients/${c.clientId}`}>
                {c.name}
              </A>,
              <span className="font-semibold text-slate-900">{chf(c.lateCents)}</span>,
              <Badge tone="danger">{c.maxLate} j</Badge>,
            ])}
          />
        </Card>
      </div>
    </Container>
  );
}
