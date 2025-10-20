"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserData() {
  try {
    const user = await currentUser();

    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      return {
        success: false,
        error: "Unauthorized or missing email address",
        isTenant: true, // Default to tenant
      };
    }

    const email = user.emailAddresses?.[0]?.emailAddress;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperUser: true,
        isTenant: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existingUser) {
      return {
        success: true,
        ...existingUser,
      };
    }

    // Check if user email exists in WorkforceRegistry
    const workforceEntry = await prisma.workforceRegistry.findFirst({
      where: { email: email },
      select: { id: true },
    });

    // If user is in WorkforceRegistry, they are NOT a tenant
    const isTenant = !workforceEntry;

    // Insert new user
    const newUser = await prisma.user.create({
      data: {
        name: user.fullName ?? "",
        email: email,
        isTenant: isTenant,
      },
    });

    return {
      success: true,
      ...newUser,
    };
  } catch (e) {
    console.error("Error in getCurrentUserData:", e);
    return {
      success: false,
      error: (e as Error).message || "Server error",
      isTenant: true, // Default to tenant on error
    };
  }
}
