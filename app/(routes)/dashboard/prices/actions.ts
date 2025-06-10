'use server';
import { prisma } from '@/lib/prisma';

export async function addPriceItem(name: string, price: number, unit: string, quantity = 1, tenantEmail: string) {
  const item = await prisma.priceItem.create({
    data: { name, price, unit, quantity, tenantEmail },
  });
  return item;
}

export async function getPriceItems() {
  return await prisma.priceItem.findMany({ orderBy: { id: 'desc' } });
}

export async function updatePriceItem(id: number, name: string, price: number, unit: string, quantity = 1, tenantEmail: string) {
  const item = await prisma.priceItem.update({
    where: { id, tenantEmail },
    data: { name, price, unit, quantity },
  });
  return item;
}

export async function deletePriceItem(id: number) {
  await prisma.priceItem.delete({ where: { id } });
  return true;
}
