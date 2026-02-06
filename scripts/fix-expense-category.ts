import { prisma } from "../src/lib/prisma";

async function main() {
  const res = await prisma.expense.updateMany({
    where: { category: "AUTRE" },
    data: { category: "DIVERS" },
  });

  console.log("Updated expenses:", res.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
