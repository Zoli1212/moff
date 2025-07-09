'use server';

import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function getUserWorks() {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const emailId = user.emailAddresses[0].emailAddress || user.primaryEmailAddress?.emailAddress;

  const works = await prisma.myWork.findMany({
    where: {
      tenantEmail: emailId,
    },
    orderBy: {
      date: 'desc',
    },
  });

  return works;
}

export async function deleteWork(id: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Verify the work belongs to the user
  const work = await prisma.myWork.findUnique({
    where: { id },
    select: { 
      tenantEmail: true,
      requirements: {
        select: { id: true }
      }
    }
  });

  if (!work || work.tenantEmail !== user.emailAddresses[0].emailAddress) {
    throw new Error('Unauthorized');
  }

  // Get all requirement IDs for this work
  const requirementIds = work.requirements.map(req => req.id);

  // Use a transaction to ensure all deletions succeed or fail together
  await prisma.$transaction([
    // Delete related offers first (they reference requirements)
    prisma.offer.deleteMany({
      where: { 
        requirementId: { in: requirementIds }
      }
    }),
    
    // Delete requirements
    prisma.requirement.deleteMany({
      where: { myWorkId: id }
    }),
    
    // Finally delete the work
    prisma.myWork.delete({
      where: { id }
    })
  ]);

  return { success: true };
}

export async function getWorkById(id: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  const work = await prisma.myWork.findUnique({
    where: { id },
  });

  // Verify the work belongs to the user
  if (!work || work.tenantEmail !== user.emailAddresses[0].emailAddress) {
    throw new Error('Unauthorized');
  }

  return work;
}
