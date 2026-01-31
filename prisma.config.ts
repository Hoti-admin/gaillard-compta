import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    db: {
      url: process.env.DATABASE_URL!,
      // directUrl est optionnel. Si tu ne l'as pas, laisse commenté.
      // directUrl: process.env.DIRECT_URL,
    },
  },
});
