import { prisma } from "@/lib/prisma";

async function main() {
  // ✅ On évite le type enum Prisma (AUTRE n'existe plus)
  // On met à jour via SQL brut
  const res = await prisma.$executeRawUnsafe(`
    UPDATE "Expense"
    SET "category" = 'DIVERS'
    WHERE "category" = 'AUTRE';
  `);

  console.log("Updated rows:", res);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
