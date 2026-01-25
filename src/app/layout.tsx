import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata = { title: "Comptabilité – GAILLARD" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "GAILLARD Jean-Paul SA";

  return (
    <html lang="fr">
      <body>
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 shadow-sm" />
                <div>
                  <div className="text-base font-extrabold tracking-tight text-slate-900">{company}</div>
                  <div className="text-xs font-semibold text-slate-500">Comptabilité · TVA · Fiduciaire</div>
                </div>
              </div>

              <TopNav />
            </div>
          </div>
        </header>

        <main className="min-h-[75vh]">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 text-xs text-slate-500 md:px-6">
            Version Pro (MVP) · Données en CHF · © {new Date().getFullYear()} {company}
          </div>
        </footer>
      </body>
    </html>
  );
}
