import { prisma } from "@/lib/prisma";
import { Card, Container, Button, ButtonGhost, Input, Table, A, PageTitle, Select, Badge } from "@/components/ui";
import { createSupplier } from "@/app/actions";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; sort?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const q = (sp.q || "").trim();
  const sort = sp.sort || "name_asc";

  const orderBy =
    sort === "name_desc"
      ? ({ name: "desc" } as const)
      : sort === "recent"
      ? ({ createdAt: "desc" } as const)
      : ({ name: "asc" } as const);

  const where = q
    ? {
        name: { contains: q, mode: "insensitive" as const },
      }
    : {};

  const suppliers = await prisma.supplier.findMany({ where, orderBy });

  return (
    <Container>
      <PageTitle
        title="Fournisseurs"
        subtitle="Recherche + tri (fiduciaire)."
        right={
          <form action="/suppliers" method="get" className="flex flex-wrap items-center gap-2">
            <Input name="q" defaultValue={q} placeholder="Rechercher un fournisseur…" className="w-64" />
            <Select name="sort" defaultValue={sort} className="w-44">
              <option value="name_asc">Nom A → Z</option>
              <option value="name_desc">Nom Z → A</option>
              <option value="recent">Récents</option>
            </Select>
            <ButtonGhost type="submit">Rechercher</ButtonGhost>
            {(q || sort !== "name_asc") && (
              <a
                href="/suppliers"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Reset
              </a>
            )}
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Ajouter un fournisseur">
          <form action={createSupplier} className="space-y-3">
            <Input name="name" placeholder="Nom fournisseur (ex: Sikkens)" required />
            <Input name="email" placeholder="Email (optionnel)" />
            <Input name="phone" placeholder="Téléphone (optionnel)" />
            <Input name="address" placeholder="Adresse (optionnel)" />
            <Button type="submit">Créer</Button>
          </form>
        </Card>

        <div className="md:col-span-2">
          <Card
            title={
              <div className="flex flex-wrap items-center gap-2">
                <span>Liste fournisseurs</span>
                <Badge tone="info">{suppliers.length}</Badge>
                {q ? <Badge tone="neutral">Filtre: “{q}”</Badge> : null}
              </div>
            }
          >
            <Table
              headers={["Nom", "Contact"]}
              rows={suppliers.map((s) => [
                <A key={s.id} href={`/suppliers/${s.id}`}>
                  {s.name}
                </A>,
                [s.email, s.phone].filter(Boolean).join(" · ") || "—",
              ])}
            />
          </Card>
        </div>
      </div>
    </Container>
  );
}
