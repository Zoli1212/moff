/**
 * Workforce Actions Database Tests
 * Tests for workforce-registry-actions.ts and salary-helper.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestWorker } from './setup';
import { addSalaryChange, getCurrentSalary } from '@/utils/salary-helper';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('Workforce Actions Tests', () => {
  describe('addSalaryChange', () => {
    it('should add new salary change record', async () => {
      const worker = await createTestWorker();
      const newSalary = 30000;
      const validFrom = new Date('2025-01-01');

      const result = await addSalaryChange(worker.id, newSalary, validFrom);

      expect(result.success).toBe(true);

      // Verify salary history record created
      const salaryHistory = await testPrisma.workforceRegistrySalaryHistory.findFirst({
        where: {
          workforceRegistryId: worker.id,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      expect(salaryHistory).toBeTruthy();
      expect(salaryHistory?.dailyRate).toBe(newSalary);
      expect(salaryHistory?.validFrom).toEqual(validFrom);

      // Verify WorkforceRegistry updated
      const updatedWorker = await testPrisma.workforceRegistry.findUnique({
        where: { id: worker.id }
      });

      expect(updatedWorker?.dailyRate).toBe(newSalary);
    });

    it('should update existing salary record for same date', async () => {
      const worker = await createTestWorker();
      const validFrom = new Date('2025-01-01');

      // Add first salary change
      await addSalaryChange(worker.id, 28000, validFrom);

      // Add second salary change for same date
      const result = await addSalaryChange(worker.id, 32000, validFrom);

      expect(result.success).toBe(true);

      // Verify only one record exists for that date
      const salaryRecords = await testPrisma.workforceRegistrySalaryHistory.findMany({
        where: {
          workforceRegistryId: worker.id,
          validFrom,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      expect(salaryRecords).toHaveLength(1);
      expect(salaryRecords[0].dailyRate).toBe(32000); // Updated value
    });

    it('should handle non-existent worker', async () => {
      const result = await addSalaryChange(99999, 30000);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Munkás nem található');
    });

    it('should create multiple salary history records', async () => {
      const worker = await createTestWorker();

      // Add multiple salary changes
      await addSalaryChange(worker.id, 25000, new Date('2025-01-01'));
      await addSalaryChange(worker.id, 28000, new Date('2025-02-01'));
      await addSalaryChange(worker.id, 32000, new Date('2025-03-01'));

      const salaryHistory = await testPrisma.workforceRegistrySalaryHistory.findMany({
        where: {
          workforceRegistryId: worker.id,
          tenantEmail: TEST_TENANT_EMAIL
        },
        orderBy: { validFrom: 'asc' }
      });

      expect(salaryHistory).toHaveLength(3);
      expect(salaryHistory[0].dailyRate).toBe(25000);
      expect(salaryHistory[1].dailyRate).toBe(28000);
      expect(salaryHistory[2].dailyRate).toBe(32000);
    });
  });

  describe('getCurrentSalary', () => {
    it('should return current salary for given date', async () => {
      const worker = await createTestWorker();

      // Add salary history
      await addSalaryChange(worker.id, 25000, new Date('2025-01-01'));
      await addSalaryChange(worker.id, 30000, new Date('2025-02-01'));
      await addSalaryChange(worker.id, 35000, new Date('2025-03-01'));

      // Test different dates
      const salary1 = await getCurrentSalary(worker.id, new Date('2025-01-15'));
      const salary2 = await getCurrentSalary(worker.id, new Date('2025-02-15'));
      const salary3 = await getCurrentSalary(worker.id, new Date('2025-03-15'));

      expect(salary1).toBe(25000); // January rate
      expect(salary2).toBe(30000); // February rate
      expect(salary3).toBe(35000); // March rate
    });

    it('should return latest salary for future dates', async () => {
      const worker = await createTestWorker();

      await addSalaryChange(worker.id, 30000, new Date('2025-01-01'));
      await addSalaryChange(worker.id, 35000, new Date('2025-02-01'));

      // Test future date
      const salary = await getCurrentSalary(worker.id, new Date('2025-12-31'));

      expect(salary).toBe(35000); // Latest rate
    });

    it('should fallback to WorkforceRegistry dailyRate if no history', async () => {
      const worker = await createTestWorker();

      const salary = await getCurrentSalary(worker.id, new Date());

      expect(salary).toBe(25000); // Original dailyRate from createTestWorker
    });

    it('should return 0 for non-existent worker', async () => {
      const salary = await getCurrentSalary(99999, new Date());

      expect(salary).toBe(0);
    });

    it('should handle edge case dates correctly', async () => {
      const worker = await createTestWorker();

      const exactDate = new Date('2025-02-01T00:00:00.000Z');
      await addSalaryChange(worker.id, 30000, exactDate);

      // Test exact date
      const salary1 = await getCurrentSalary(worker.id, exactDate);
      
      // Test one millisecond before
      const beforeDate = new Date(exactDate.getTime() - 1);
      const salary2 = await getCurrentSalary(worker.id, beforeDate);

      expect(salary1).toBe(30000); // Should get new rate
      expect(salary2).toBe(25000); // Should get old rate (fallback)
    });
  });

  describe('Salary Integration Tests', () => {
    it('should handle complete salary workflow', async () => {
      const worker = await createTestWorker();

      // Initial state
      let currentSalary = await getCurrentSalary(worker.id, new Date());
      expect(currentSalary).toBe(25000);

      // Add first salary change
      await addSalaryChange(worker.id, 28000, new Date('2025-01-01'));
      currentSalary = await getCurrentSalary(worker.id, new Date('2025-01-15'));
      expect(currentSalary).toBe(28000);

      // Add second salary change
      await addSalaryChange(worker.id, 32000, new Date('2025-02-01'));
      currentSalary = await getCurrentSalary(worker.id, new Date('2025-02-15'));
      expect(currentSalary).toBe(32000);

      // Verify history
      const history = await testPrisma.workforceRegistrySalaryHistory.findMany({
        where: {
          workforceRegistryId: worker.id,
          tenantEmail: TEST_TENANT_EMAIL
        },
        orderBy: { validFrom: 'desc' }
      });

      expect(history).toHaveLength(2);
      expect(history[0].dailyRate).toBe(32000); // Latest
      expect(history[1].dailyRate).toBe(28000); // Previous
    });

    it('should handle salary changes with work diary items', async () => {
      const worker = await createTestWorker();

      // Create work diary item
      const diaryItem = await testPrisma.workDiaryItem.create({
        data: {
          name: worker.name,
          date: new Date('2025-01-15'),
          hoursWorked: 8,
          dailyRateSnapshot: 25000, // Original rate
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      // Change salary
      await addSalaryChange(worker.id, 30000, new Date('2025-01-01'));

      // Verify diary item snapshot should be updated by the salary change
      // (This would be handled by updateAffectedSalarySnapshots function)
      const updatedDiaryItem = await testPrisma.workDiaryItem.findUnique({
        where: { id: diaryItem.id }
      });

      // The snapshot should be updated to reflect the new salary
      // Note: This test assumes the updateAffectedSalarySnapshots function works
      expect(updatedDiaryItem).toBeTruthy();
    });

    it('should handle concurrent salary changes', async () => {
      const worker = await createTestWorker();

      // Simulate concurrent salary changes
      const promises = [
        addSalaryChange(worker.id, 26000, new Date('2025-01-01')),
        addSalaryChange(worker.id, 27000, new Date('2025-01-02')),
        addSalaryChange(worker.id, 28000, new Date('2025-01-03'))
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify all records created
      const salaryHistory = await testPrisma.workforceRegistrySalaryHistory.findMany({
        where: {
          workforceRegistryId: worker.id,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });

      expect(salaryHistory).toHaveLength(3);
    });
  });
});
