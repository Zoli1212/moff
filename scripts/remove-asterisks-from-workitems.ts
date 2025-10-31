import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeAsterisksFromWorkItems() {
  console.log('🔍 Keresés: WorkItem-ek csillagokkal...');
  
  // Lekérjük az összes workItem-et
  const allWorkItems = await prisma.workItem.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`📊 Összesen ${allWorkItems.length} workItem található`);

  let updatedCount = 0;

  for (const item of allWorkItems) {
    // Eltávolítjuk a csillagokat a név elejéről és végéről
    const cleanedName = item.name
      .replace(/^\*+\s*/, '')  // Csillagok a név elején
      .replace(/\s*\*+$/, ''); // Csillagok a név végén

    // Ha változott a név, frissítjük
    if (cleanedName !== item.name) {
      await prisma.workItem.update({
        where: { id: item.id },
        data: { name: cleanedName },
      });
      
      console.log(`✅ Frissítve: "${item.name}" → "${cleanedName}"`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Kész! ${updatedCount} workItem frissítve.`);
  
  await prisma.$disconnect();
}

removeAsterisksFromWorkItems()
  .catch((error) => {
    console.error('❌ Hiba:', error);
    process.exit(1);
  });
