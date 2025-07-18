"use server";

import { prisma } from "@/lib/prisma";

// Új blokk hozzáadása egy requirementhez
export async function addRequirementBlock(requirementId: number, blockText: string) {
  if (!requirementId || !blockText) throw new Error("Missing params");
  const block = await prisma.requirementItemsBlock.create({
    data: {
      requirementId,
      blockText,
    },
  });
  return block;
}

// Blokkok lekérdezése egy requirementhez
export async function getRequirementBlocks(requirementId: number) {
  if (!requirementId) throw new Error("Missing requirementId");
  return prisma.requirementItemsBlock.findMany({
    where: { requirementId },
    orderBy: { createdAt: "asc" },
  });
}
