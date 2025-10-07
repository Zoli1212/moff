import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuantityConsistency() {
  console.log('🔍 Ellenőrzés: WorkItem.completedQuantity vs WorkDiaryItem.quantity összeg\n');

  try {
    // Minden WorkItem lekérése a kapcsolódó WorkDiaryItem-ekkel
    const workItems = await prisma.workItem.findMany({
      select: {
        id: true,
        name: true,
        completedQuantity: true,
        quantity: true,
        unit: true,
        workDiaryItems: {
          select: {
            id: true,
            quantity: true,
            progressAtDate: true,
            date: true,
          },
          orderBy: {
            date: 'asc'
          }
        }
      }
    });

    console.log(`📊 Összesen ${workItems.length} WorkItem vizsgálata...\n`);

    let inconsistentCount = 0;
    let totalCount = 0;

    for (const workItem of workItems) {
      totalCount++;
      
      // Napló bejegyzések quantity összege
      const diaryQuantitySum = workItem.workDiaryItems.reduce(
        (sum, diary) => sum + (diary.quantity || 0), 
        0
      );
      
      // Legutóbbi progressAtDate érték
      const latestProgressAtDate = workItem.workDiaryItems.length > 0 
        ? workItem.workDiaryItems[workItem.workDiaryItems.length - 1]?.progressAtDate || 0
        : 0;

      const completedQuantity = workItem.completedQuantity || 0;
      
      // Ellenőrzés
      const isConsistent = Math.abs(completedQuantity - diaryQuantitySum) < 0.01;
      const progressConsistent = Math.abs(completedQuantity - latestProgressAtDate) < 0.01;
      
      if (!isConsistent || !progressConsistent) {
        inconsistentCount++;
        console.log(`❌ ELTÉRÉS - ${workItem.name} (ID: ${workItem.id})`);
        console.log(`   📋 WorkItem.completedQuantity: ${completedQuantity} ${workItem.unit}`);
        console.log(`   📝 Napló quantity összeg: ${diaryQuantitySum} ${workItem.unit}`);
        console.log(`   📅 Legutóbbi progressAtDate: ${latestProgressAtDate} ${workItem.unit}`);
        console.log(`   🔢 Napló bejegyzések száma: ${workItem.workDiaryItems.length}`);
        
        if (workItem.workDiaryItems.length > 0) {
          console.log(`   📊 Napló részletek:`);
          workItem.workDiaryItems.forEach((diary, index) => {
            console.log(`      ${index + 1}. ${diary.date.toISOString().split('T')[0]} - quantity: ${diary.quantity}, progressAtDate: ${diary.progressAtDate}`);
          });
        }
        console.log('');
      } else {
        console.log(`✅ OK - ${workItem.name}: ${completedQuantity} ${workItem.unit}`);
      }
    }

    console.log('\n📈 ÖSSZEFOGLALÓ:');
    console.log(`   Vizsgált WorkItem-ek: ${totalCount}`);
    console.log(`   Konzisztens: ${totalCount - inconsistentCount}`);
    console.log(`   Eltérő: ${inconsistentCount}`);
    
    if (inconsistentCount === 0) {
      console.log('🎉 Minden adat konzisztens!');
    } else {
      console.log(`⚠️  ${inconsistentCount} WorkItem-nél van eltérés!`);
    }

  } catch (error) {
    console.error('❌ Hiba az ellenőrzés során:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Futtatás
checkQuantityConsistency();
