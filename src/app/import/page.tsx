import { Container, PageTitle, Card } from "@/components/ui";

export default function ImportPage() {
  return (
    <Container>
      <PageTitle
        title="Import"
        subtitle="Import Excel (.xlsx) pour factures fournisseurs. Colonnes: supplier, issueDate, dueDate, number, gross, vatRate"
      />

      <Card title="Importer achats fournisseurs (xlsx)">
        <form action="/api/import/bills.xlsx" method="post" encType="multipart/form-data" className="space-y-3">
          <input type="file" name="file" accept=".xlsx" required />
          <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            Importer
          </button>
          <p className="text-xs text-slate-600">
            Dates au format YYYY-MM-DD. gross = TTC. vatRate = 8.1 (défaut si vide).
          </p>
        </form>
      </Card>

      <Card title="Importer PDF (archivage)">
        <p className="text-sm text-slate-700">
          L’upload PDF se fait directement depuis un fournisseur (dans la liste achats) — prochaine étape si tu veux : affichage & téléchargement.
        </p>
      </Card>
    </Container>
  );
}
