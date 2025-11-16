/**
 * Vállalkozói szintű ár mentése - amikor az offer-detail-mobile-ban módosítják az árakat
 * Vállalkozói szint = tenant-specifikus ár a TenantPriceList-ben
 */
export async function saveTenantPrice(
  task: string,
  category: string | null,
  technology: string | null,
  unit: string | null,
  laborCost: number,
  materialCost: number
) {
  try {
    // Tisztítsd meg a task nevet a * karaktertől
    const cleanedTask = task.replace(/^\*+\s*/, "").trim();

    // Tenant email lekérése
    const { tenantEmail } = await getTenantSafeAuth();

    console.log("saveTenantPrice meghívva:", {
      originalTask: task,
      cleanedTask,
      tenantEmail,
      category,
      technology,
      unit,
      laborCost,
      materialCost,
    });

    // Vállalkozói szintű ár = tenant-specifikus ár a TenantPriceList-ben
    // Upsert: ha már van ilyen task-hoz ár, frissítjük; ha nincs, létrehozzuk

    // Csak azokat a mezőket adjuk meg, amelyeknek van értéke
    const updateData: any = {
      laborCost,
      materialCost,
    };

    if (unit) {
      updateData.unit = unit;
    }
    if (category) {
      updateData.category = category;
    }
    if (technology) {
      updateData.technology = technology;
    }

    const createData: any = {
      task: cleanedTask,
      tenantEmail,
      laborCost,
      materialCost,
    };

    if (unit) {
      createData.unit = unit;
    }
    if (category) {
      createData.category = category;
    }
    if (technology) {
      createData.technology = technology;
    }

    const result = await prisma.tenantPriceList.upsert({
      where: {
        tenant_task_unique: {
          task: cleanedTask,
          tenantEmail,
        },
      },
      update: updateData,
      create: createData,
    });

    console.log("saveTenantPrice sikeres:", result);

    revalidatePath("/prices");

    return {
      success: true,
      message: "Vállalkozói szintű ár sikeresen mentve",
      data: result,
    };
  } catch (error) {
    console.error("Hiba a vállalkozói szintű ár mentésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a vállalkozói szintű ár mentésekor",
    };
  }
}

/**
 * Globális ár mentése - amikor az offer-detail-mobile-ban módosítják az árakat
 * Globális szint = globális ár a PriceList-ben (tenantEmail: '')
 */
export async function saveGlobalPrice(
  task: string,
  category: string | null,
  technology: string | null,
  unit: string | null,
  laborCost: number,
  materialCost: number
) {
  try {
    // Tisztítsd meg a task nevet a * karaktertől
    const cleanedTask = task.replace(/^\*+\s*/, "").trim();

    console.log("saveGlobalPrice meghívva:", {
      originalTask: task,
      cleanedTask,
      category,
      technology,
      unit,
      laborCost,
      materialCost,
    });

    // Globális szintű ár = globális ár a PriceList-ben (tenantEmail: '')
    // Upsert: ha már van ilyen task-hoz ár, frissítjük; ha nincs, létrehozzuk

    // Csak azokat a mezőket adjuk meg, amelyeknek van értéke
    const updateData: any = {
      laborCost,
      materialCost,
    };

    if (unit) {
      updateData.unit = unit;
    }
    if (category) {
      updateData.category = category;
    }
    if (technology) {
      updateData.technology = technology;
    }

    const createData: any = {
      task: cleanedTask,
      tenantEmail: "", // Globális = üres string
      laborCost,
      materialCost,
    };

    if (unit) {
      createData.unit = unit;
    }
    if (category) {
      createData.category = category;
    }
    if (technology) {
      createData.technology = technology;
    }

    const result = await prisma.priceList.upsert({
      where: {
        task_tenantEmail: {
          task: cleanedTask,
          tenantEmail: "", // Globális = üres string
        },
      },
      update: updateData,
      create: createData,
    });

    console.log("saveGlobalPrice sikeres:", result);

    return {
      success: true,
      message: "Globális ár sikeresen mentve",
      data: result,
    };
  } catch (error) {
    console.error("Hiba a globális ár mentésekor:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Ismeretlen hiba történt a globális ár mentésekor",
    };
  }
}
