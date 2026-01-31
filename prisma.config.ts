import type { PrismaConfig } from "prisma";

export default {
  schema: "prisma/schema.prisma",

  // ✅ Prisma v7: datasource = { url }, PAS datasource.db
  datasource: {
    url: process.env.DATABASE_URL!,
    // shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL, // optionnel
  },
} satisfies PrismaConfig;
