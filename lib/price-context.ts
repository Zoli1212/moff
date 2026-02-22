import { prisma } from "@/lib/prisma";

export async function buildPriceContext(): Promise<string> {
  const [globalPrices, tenantPrices] = await Promise.all([
    prisma.priceList.findMany({
      where: { tenantEmail: "" },
      select: {
        category: true,
        task: true,
        technology: true,
        unit: true,
        laborCost: true,
        materialCost: true,
      },
      orderBy: { category: "asc" },
      take: 150,
    }),
    prisma.tenantPriceList.findMany({
      select: {
        task: true,
        category: true,
        technology: true,
        unit: true,
        laborCost: true,
        materialCost: true,
      },
      orderBy: { task: "asc" },
      take: 150,
    }),
  ]);

  let context = "";

  if (globalPrices.length > 0) {
    context += "GLOBÁLIS ÁRAK (adatbázis):\n";
    for (const p of globalPrices) {
      const tech = p.technology ? `, ${p.technology}` : "";
      const total = p.laborCost + p.materialCost;
      context += `- ${p.task} (${p.category}${tech}) | ${p.unit} | Munkadíj: ${p.laborCost} Ft | Anyag: ${p.materialCost} Ft | Összesen: ${total} Ft\n`;
    }
    context += "\n";
  }

  if (tenantPrices.length > 0) {
    // Average prices across all tenants per task
    const taskMap = new Map<
      string,
      {
        laborSum: number;
        materialSum: number;
        count: number;
        unit: string;
        category: string;
        technology: string;
      }
    >();

    for (const p of tenantPrices) {
      const key = p.task;
      if (taskMap.has(key)) {
        const e = taskMap.get(key)!;
        e.laborSum += p.laborCost;
        e.materialSum += p.materialCost;
        e.count++;
      } else {
        taskMap.set(key, {
          laborSum: p.laborCost,
          materialSum: p.materialCost,
          count: 1,
          unit: p.unit ?? "",
          category: p.category ?? "",
          technology: p.technology ?? "",
        });
      }
    }

    context += "PIACI ÁTLAGÁRAK (vállalkozói adatok alapján):\n";
    for (const [task, d] of taskMap) {
      const avgLabor = Math.round(d.laborSum / d.count);
      const avgMaterial = Math.round(d.materialSum / d.count);
      const avgTotal = avgLabor + avgMaterial;
      const tech = d.technology ? `, ${d.technology}` : "";
      context += `- ${task} (${d.category}${tech}) | ${d.unit} | Munkadíj átlag: ${avgLabor} Ft | Anyag átlag: ${avgMaterial} Ft | Összesen átlag: ${avgTotal} Ft\n`;
    }
    context += "\n";
  }

  return context;
}
