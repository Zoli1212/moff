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
      // Check if user is in WorkforceRegistry (worker)
      const workforceEntry = await prisma.workforceRegistry.findFirst({
        where: { email: email },
        select: { id: true },
      });

      // If in WorkforceRegistry, update isTenant to false
      if (workforceEntry && existingUser.isTenant) {
        await prisma.user.update({
          where: { email },
          data: { isTenant: false },
        });
        return {
          success: true,
          ...existingUser,
          isTenant: false,
        };
      }

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
        clerkId: user.id,
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

export async function getProcurementEmailTemplate() {
  try {
    const user = await currentUser();
    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      throw new Error("Unauthorized");
    }

    const tenantEmail = user.emailAddresses[0].emailAddress;

    const userData = await prisma.user.findUnique({
      where: { email: tenantEmail },
      select: { procurementEmailTemplate: true },
    });

    return userData?.procurementEmailTemplate || "";
  } catch (error) {
    console.error("Error getting procurement email template:", error);
    throw error;
  }
}

export async function saveProcurementEmailTemplate(template: string) {
  try {
    const user = await currentUser();
    if (!user || !user.emailAddresses?.[0]?.emailAddress) {
      throw new Error("Unauthorized");
    }

    const tenantEmail = user.emailAddresses[0].emailAddress;

    await prisma.user.update({
      where: { email: tenantEmail },
      data: { procurementEmailTemplate: template },
    });

    return { success: true };
  } catch (error) {
    console.error("Error saving procurement email template:", error);
    throw error;
  }
}
