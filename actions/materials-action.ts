"use server";

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

interface AddMaterialInput {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  workId: number;
  workItemId: number;
}

export async function addMaterial({ name, quantity, unit, unitPrice, workId, workItemId }: AddMaterialInput) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail = user.emailAddresses[0].emailAddress || user.primaryEmailAddress?.emailAddress || "";

  // Optionally: check if the user owns the work/workItem

  const totalPrice = quantity * unitPrice;

  const material = await prisma.material.create({
    data: {
      name,
      quantity,
      unit,
      unitPrice,
      totalPrice,
      workId,
      workItemId,
      tenantEmail,
    },
  });

  revalidatePath(`/supply/${workId}`);
  revalidatePath(`/supply`);
  

  return material;
}

interface UpdateMaterialInput {
  id: number;
  name?: string;
  quantity?: number;
  unit?: string;
  availableQuantity?: number;
  availableFull?: boolean;
}

export async function updateMaterial({ id, name, quantity, unit, availableQuantity, availableFull }: UpdateMaterialInput) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const tenantEmail = user.emailAddresses[0].emailAddress || user.primaryEmailAddress?.emailAddress || "";
  // Find material and check ownership
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new Error("Material not found");
  if (material.tenantEmail !== tenantEmail) throw new Error("Not authorized for this tenant");
  const updateData: any = {
    tenantEmail,
  };
  if (name !== undefined) updateData.name = name;
  if (unit !== undefined) updateData.unit = unit;
  if (quantity !== undefined) {
    updateData.quantity = quantity;
    updateData.totalPrice = material.unitPrice * quantity;
  }
  if (availableQuantity !== undefined) updateData.availableQuantity = availableQuantity;
  if (availableFull !== undefined) updateData.availableFull = availableFull;
  const updated = await prisma.material.update({
    where: { id },
    data: updateData,
  });
  revalidatePath(`/supply/${material.workId}`);
  revalidatePath(`/supply`);
  return updated;
}

// Set availableQuantity to quantity and availableFull to true
export async function setMaterialAvailableFull(id: number) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new Error("Material not found");
  const updated = await prisma.material.update({
    where: { id },
    data: {
      availableQuantity: Math.round(material.quantity),
      availableFull: true,
    },
  });
  revalidatePath(`/supply/${material.workId}`);
  revalidatePath(`/supply`);
  return updated;
}

export async function deleteMaterial(id: number) {
  const user = await currentUser();
  if (!user) throw new Error("Not authenticated");
  const material = await prisma.material.findUnique({ where: { id } });
  if (!material) throw new Error("Material not found");
  await prisma.material.delete({ where: { id } });
  revalidatePath(`/supply/${material.workId}`);
  revalidatePath(`/supply`);
  return true;
}
