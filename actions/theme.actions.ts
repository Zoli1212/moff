'use server';

import { currentUser } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Theme = 'landing' | 'corporate' | 'common';

export async function getTheme(): Promise<Theme> {
  const user = await currentUser();
  if (!user || !user.emailAddresses?.[0]?.emailAddress) return 'landing';

  const email = user.emailAddresses[0].emailAddress;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { theme: true }
    });

    return (dbUser?.theme as Theme) || 'landing';
  } catch (error) {
    console.error('Error getting theme:', error);
    return 'landing';
  }
}

export async function setTheme(theme: Theme): Promise<{ success: boolean; error?: string }> {
  const user = await currentUser();
  if (!user || !user.emailAddresses?.[0]?.emailAddress) {
    return { success: false, error: 'Unauthorized' };
  }

  const email = user.emailAddresses[0].emailAddress;
  const name = user.fullName || user.firstName || 'User';

  try {
    await prisma.user.upsert({
      where: { email },
      update: { theme },
      create: { 
        email,
        name,
        theme,
        role: 'USER'
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving theme preference:', error);
    return { success: false, error: 'Failed to save theme preference' };
  }
}
