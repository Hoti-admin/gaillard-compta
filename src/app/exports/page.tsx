import { Container, PageTitle, Card, Select, ButtonGhost } from "@/components/ui";

export default async function ExportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const currentYear = new Date().getFullYear();
  const year = Number(sp.year || currentYear);
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <Container>
      <PageTitle
        title="Exports fiduciaire"
        subtitle="Exports Excel/PDF (clients en retard, CA mensuel, TVA résumé)."
        right={
          <form action="/exports" method="get" className="flex items-center gap-2">
            <Select name="year" defaultValue={String(year)} className="w-28">
              {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </Select>
            <ButtonGhost type="submit">Appliquer</ButtonGhost>
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={`Clients en retard – ${year}`}>
          <div className="flex flex-wrap gap-2">
            <a className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
               href={`/api/export/late-clients.xlsx?year=${year}`}>
              Export Excel
            </a>
            <a className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
               href={`/api/export/late-clients.pdf?year=${year}`}>
              Export PDF
            </a>
          </div>
        </Card>

        <Card title={`CA clients par mois – ${year}`}>
          <a className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
             href={`/api/export/turnover-monthly.xlsx?year=${year}`}>
            Export Excel
          </a>
        </Card>

        <Card title="TVA facturée vs payée (3 ans)">
          <a className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
             href={`/api/export/vat-summary.xlsx`}>
            Export Excel
          </a>
        </Card>

        <Card title={`TVA facturée vs payée – ${year}`}>
          <a className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
             href={`/api/export/vat-summary.xlsx?year=${year}`}>
            Export Excel (année)
          </a>
        </Card>
      </div>
    </Container>
  );
}
