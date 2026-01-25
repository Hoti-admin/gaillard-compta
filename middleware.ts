import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes publiques (accessibles sans login)
const PUBLIC_ROUTES = new Set<string>(["/login"]);

// Prefixes à ignorer (assets, API, etc.)
const PUBLIC_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/api", // on laisse toutes les routes API passer (si tu veux protéger certaines API, on le fera plus tard)
  "/public",
];

function isPublic(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

function normalizeEmails(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1) Laisser passer tout ce qui est public
  if (isPublic(pathname)) return NextResponse.next();

  // 2) Préparer la réponse (pour pouvoir écrire des cookies si besoin)
  const res = NextResponse.next();

  // 3) Supabase server client via cookies request/response
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sécurité : si env manquantes, on bloque proprement
  if (!supabaseUrl || !supabaseAnon) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "missing_env");
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // 4) Lire utilisateur
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // 5) Non connecté -> /login?next=...
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // 6) Check admin allowlist
  const admins = normalizeEmails(process.env.ADMIN_EMAILS);
  const email = (user.email || "").toLowerCase();

  if (admins.length > 0 && !admins.includes(email)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_admin");
    return NextResponse.redirect(url);
  }

  return res;
}

// matcher pro : protège tout sauf assets Next
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
