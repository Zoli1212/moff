'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

// Get all specialties for the current user
export async function getSpecialties() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  return await prisma.specialty.findMany({
    where: { tenantEmail: user.email },
    orderBy: { name: 'asc' }
  });
}

// Get a single specialty by ID
export async function getSpecialty(id: number) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  const specialty = await prisma.specialty.findUnique({
    where: { id }
  });

  // Verify the specialty belongs to the user
  if (!specialty || specialty.tenantEmail !== user.email) {
    throw new Error('Specialty not found or access denied');
  }

  return specialty;
}

// Create a new specialty
export async function createSpecialty(name: string, description?: string) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  return await prisma.specialty.create({
    data: {
      name,
      description,
      tenantEmail: user.email,
    },
  });
}

// Update an existing specialty
export async function updateSpecialty(id: number, data: { name: string; description?: string }) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id,
      tenantEmail: user.email
    }
  });

  if (!specialty) {
    throw new Error('Specialty not found or access denied');
  }

  return await prisma.specialty.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description
    }
  });
}

// Delete a specialty
export async function deleteSpecialty(id: number) {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Get user's email from Clerk
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { email: true }
  });

  if (!user?.email) {
    throw new Error('User not found');
  }

  // Verify the specialty belongs to the user
  const specialty = await prisma.specialty.findFirst({
    where: {
      id,
      tenantEmail: user.email
    }
  });

  if (!specialty) {
    throw new Error('Specialty not found or access denied');
  }

  // Delete the specialty (cascading deletes will handle related records)
  return await prisma.specialty.delete({
    where: { id }
  });
}
