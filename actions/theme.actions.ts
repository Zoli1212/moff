'use server';

import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Theme = 'landing' | 'corporate' | 'common';

export async function getTheme(): Promise<Theme> {
  const { userId } = await auth();
  if (!userId) return 'landing';

  try {
    const user = await prisma.user.findUnique({
      where: { email: userId },
      select: { theme: true }
    });

    return (user?.theme as Theme) || 'landing';
  } catch (error) {
    console.error('Error getting theme:', error);
    return 'landing';
  }
}

export async function setTheme(theme: Theme): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  try {
    await prisma.user.upsert({
      where: { email: userId },
      update: { theme },
      create: { 
        email: userId, 
        name: userId, 
        theme,
        role: 'USER' // Add required field
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving theme preference:', error);
    return { success: false, error: 'Failed to save theme preference' };
  }
}
