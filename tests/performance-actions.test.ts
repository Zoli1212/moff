/**
 * Performance Actions Tests
 * Tests for performance-actions.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestWork, createTestOffer, createTestMyWork } from './setup';
import { updateExpectedProfitPercent, getExpectedProfitPercent } from '@/actions/performance-actions';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

describe('Performance Actions Tests', () => {
  describe('updateExpectedProfitPercent', () => {
    it('should create new performance record with expected profit percent', async () => {
      // Create test work
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      const result = await updateExpectedProfitPercent(work.id, 25);
      
      expect(result.success).toBe(true);
      expect(result.performance).toBeDefined();
      expect(result.performance?.expectedProfitPercent).toBe(25);
      expect(result.message).toBe('Elvárt profit százalék sikeresen mentve');
      
      // Verify in database
      const performance = await testPrisma.performance.findFirst({
        where: { workId: work.id, tenantEmail: TEST_TENANT_EMAIL }
      });
      
      expect(performance).toBeTruthy();
      expect(performance?.expectedProfitPercent).toBe(25);
    });

    it('should update existing performance record', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      // Create initial performance record
      await testPrisma.performance.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          expectedProfitPercent: 20,
          offerPrice: 100000,
          ownCosts: 80000,
          title: `Teljesítmény - ${work.title}`,
          status: 'active'
        }
      });
      
      // Update to new value
      const result = await updateExpectedProfitPercent(work.id, 30);
      
      expect(result.success).toBe(true);
      expect(result.performance?.expectedProfitPercent).toBe(30);
      
      // Verify only one record exists
      const performances = await testPrisma.performance.findMany({
        where: { workId: work.id, tenantEmail: TEST_TENANT_EMAIL }
      });
      
      expect(performances).toHaveLength(1);
      expect(performances[0].expectedProfitPercent).toBe(30);
    });

    it('should handle non-existent work', async () => {
      const result = await updateExpectedProfitPercent(99999, 25);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('A munka nem található vagy nincs jogosultság');
    });

    it('should handle unauthorized access', async () => {
      // Create work with different tenant
      const work = await testPrisma.work.create({
        data: {
          title: 'Unauthorized Work',
          offerId: 1,
          tenantEmail: 'different@tenant.com'
        }
      });
      
      const result = await updateExpectedProfitPercent(work.id, 25);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('A munka nem található vagy nincs jogosultság');
    });

    it('should handle zero and negative percentages', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      // Test zero
      const resultZero = await updateExpectedProfitPercent(work.id, 0);
      expect(resultZero.success).toBe(true);
      expect(resultZero.performance?.expectedProfitPercent).toBe(0);
      
      // Test negative
      const resultNegative = await updateExpectedProfitPercent(work.id, -10);
      expect(resultNegative.success).toBe(true);
      expect(resultNegative.performance?.expectedProfitPercent).toBe(-10);
    });
  });

  describe('getExpectedProfitPercent', () => {
    it('should get expected profit percent for existing performance', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      // Create performance record
      await testPrisma.performance.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          expectedProfitPercent: 35,
          offerPrice: 100000,
          ownCosts: 65000,
          title: `Teljesítmény - ${work.title}`,
          status: 'active'
        }
      });
      
      const result = await getExpectedProfitPercent(work.id);
      
      expect(result.success).toBe(true);
      expect(result.expectedProfitPercent).toBe(35);
      expect(result.hasPerformance).toBe(true);
    });

    it('should return null for non-existent performance', async () => {
      const myWork = await createTestMyWork();
      const requirement = await testPrisma.requirement.create({
        data: {
          title: 'Test Requirement',
          versionNumber: 1,
          myWorkId: myWork.id
        }
      });
      const offer = await createTestOffer(requirement.id);
      const work = await createTestWork(offer.id);
      
      const result = await getExpectedProfitPercent(work.id);
      
      expect(result.success).toBe(true);
      expect(result.expectedProfitPercent).toBeNull();
      expect(result.hasPerformance).toBe(false);
    });

    it('should handle non-existent work', async () => {
      const result = await getExpectedProfitPercent(99999);
      
      expect(result.success).toBe(true);
      expect(result.expectedProfitPercent).toBeNull();
      expect(result.hasPerformance).toBe(false);
    });
  });
});
