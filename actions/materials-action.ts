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
