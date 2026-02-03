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
    // Si un jour tu as besoin d'une "shadow database":
    // shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
