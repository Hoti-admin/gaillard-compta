// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Optionnel (recommandé Supabase pour migrations si tu as une URL directe)
    directUrl: env("DIRECT_URL"),
  },
});
