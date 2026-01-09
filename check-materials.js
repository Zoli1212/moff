const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMaterials() {
  console.log("🔍 Checking Material records...\n");

  const total = await prisma.material.count();
  console.log(`Total Materials: ${total}`);

  const withBestOffer = await prisma.material.count({
    where: {
      bestOffer: { not: null }
    }
  });
  console.log(`Materials with bestOffer: ${withBestOffer}`);

  // Show a few examples
  const examples = await prisma.material.findMany({
    where: {
      bestOffer: { not: null }
    },
    select: {
      id: true,
      name: true,
      bestOffer: true,
      updatedAt: true
    },
    take: 5
  });

  console.log("\n📋 Example Materials with prices:\n");
  examples.forEach(m => {
    console.log(`ID: ${m.id}`);
    console.log(`Name: ${m.name}`);
    console.log(`Best Offer:`, m.bestOffer);
    console.log(`Updated At: ${m.updatedAt}`);
    console.log("---");
  });

  await prisma.$disconnect();
}

checkMaterials().catch(console.error);
