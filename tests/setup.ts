/**
 * Test Setup Configuration
 * Prisma test database setup and cleanup utilities
 */

import { PrismaClient } from "@prisma/client";
import { beforeAll, afterAll, beforeEach } from "vitest";

// Test database instance
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// Test tenant email for isolation
export const TEST_TENANT_EMAIL = "test@example.com";

// Setup before all tests
beforeAll(async () => {
  // Connect to test database
  await testPrisma.$connect();
  console.log("🔗 Connected to test database");
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up test data
  await cleanupTestData();
  await testPrisma.$disconnect();
  console.log("🧹 Disconnected from test database");
});

// Clean up before each test
beforeEach(async () => {
  await cleanupTestData();
});

// Client quote test emails – az összes teszt fájl által használt
export const TEST_CLIENT_EMAIL = "client-test@offerflow-test.com";
export const TEST_OTHER_EMAIL = "other-client@offerflow-test.com";
export const TEST_PRICE_TENANT_A = "price-context-tenant-a@offerflow-test.com";
export const TEST_PRICE_TENANT_B = "price-context-tenant-b@offerflow-test.com";
export const TEST_ROUTE_EMAIL = "route-test@offerflow-test.com";

/**
 * Clean up all test data
 */
export async function cleanupTestData() {
  try {
    // Delete in correct order to avoid foreign key constraints
    await testPrisma.knowledgeBase.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    await testPrisma.workDiaryItem.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    await testPrisma.workItemWorker.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    await testPrisma.workItem.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    await testPrisma.work.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    await testPrisma.offer.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    await testPrisma.requirement.deleteMany({
      where: { myWork: { tenantEmail: TEST_TENANT_EMAIL } },
    });

    await testPrisma.myWork.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    await testPrisma.workforceRegistry.deleteMany({
      where: { tenantEmail: TEST_TENANT_EMAIL },
    });

    // Client quote test data cleanup
    await testPrisma.history.deleteMany({
      where: {
        userEmail: {
          in: [
            TEST_CLIENT_EMAIL,
            TEST_OTHER_EMAIL,
            TEST_ROUTE_EMAIL,
            "completely-different@test.com",
            "other@test.com",
          ],
        },
      },
    });

    await testPrisma.user.deleteMany({
      where: {
        email: {
          in: [TEST_CLIENT_EMAIL, TEST_OTHER_EMAIL, TEST_ROUTE_EMAIL],
        },
      },
    });

    // Price context test data cleanup
    await testPrisma.tenantPriceList.deleteMany({
      where: {
        tenantEmail: { in: [TEST_PRICE_TENANT_A, TEST_PRICE_TENANT_B] },
      },
    });

    await testPrisma.priceList.deleteMany({
      where: {
        tenantEmail: "",
        task: { startsWith: "[PCTX-TEST]" },
      },
    });

    console.log("🧹 Test data cleaned up");
  } catch (error) {
    console.error("❌ Error cleaning up test data:", error);
  }
}

/**
 * Create test MyWork record
 */
export async function createTestMyWork() {
  return await testPrisma.myWork.create({
    data: {
      title: "Test Work",
      customerName: "Test Customer",
      date: new Date(),
      location: "Test Location",
      time: "09:00",
      totalPrice: 100000,
      tenantEmail: TEST_TENANT_EMAIL,
    },
  });
}

/**
 * Create test Offer record
 */
export async function createTestOffer(requirementId: number) {
  return await testPrisma.offer.create({
    data: {
      title: "Test Offer",
      totalPrice: 150000,
      workTotal: 100000,
      materialTotal: 50000,
      requirementId,
      tenantEmail: TEST_TENANT_EMAIL,
    },
  });
}

/**
 * Create test Work record
 */
export async function createTestWork(offerId: number) {
  return await testPrisma.work.create({
    data: {
      title: "Test Work Project",
      offerId,
      tenantEmail: TEST_TENANT_EMAIL,
    },
  });
}

/**
 * Create test WorkforceRegistry record
 */
export async function createTestWorker() {
  return await testPrisma.workforceRegistry.create({
    data: {
      name: "Test Worker",
      role: "Tester",
      dailyRate: 25000,
      tenantEmail: TEST_TENANT_EMAIL,
    },
  });
}
