/**
 * Sync Salary Snapshots Actions Tests
 * Tests for sync-salary-snapshots-actions.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL, createTestWorker, createTestWork, createTestOffer, createTestMyWork } from './setup';
import { syncWorkerSalarySnapshots, syncAllWorkersSalarySnapshots, syncSalarySnapshotsAfterDate } from '@/actions/sync-salary-snapshots-actions';

// Mock auth
vi.mock('@/lib/tenant-auth', () => ({
  getTenantSafeAuth: vi.fn().mockResolvedValue({
    user: { id: 'test-user' },
    tenantEmail: TEST_TENANT_EMAIL
  })
}));

// Mock salary helper
vi.mock('@/utils/salary-helper', () => ({
  getCurrentSalary: vi.fn().mockResolvedValue(30000)
}));

describe('Sync Salary Snapshots Actions Tests', () => {
  describe('syncWorkerSalarySnapshots', () => {
    it('should sync salary snapshots for a specific worker', async () => {
      // Create test worker
      const worker = await createTestWorker();
      
      // Create test work and diary items
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
      
      // Create work diary
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      // Create diary items with old snapshot value
      await testPrisma.workDiaryItem.create({
        data: {
          workDiaryId: workDiary.id,
          workId: work.id,
          name: worker.name,
          date: new Date(),
          workHours: 8,
          dailyRateSnapshot: 25000, // Old value
          tenantEmail: TEST_TENANT_EMAIL
        }
      });
      
      const result = await syncWorkerSalarySnapshots(worker.id);
      
      expect(result.success).toBe(true);
      expect(result.workerName).toBe(worker.name);
      expect(result.updatedCount).toBeGreaterThan(0);
    });

    it('should handle non-existent worker', async () => {
      const result = await syncWorkerSalarySnapshots(99999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Munkás nem található');
    });

    it('should skip items with correct snapshot', async () => {
      const worker = await createTestWorker();
      
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
      
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      // Create diary item with correct snapshot value
      await testPrisma.workDiaryItem.create({
        data: {
          workDiaryId: workDiary.id,
          workId: work.id,
          name: worker.name,
          date: new Date(),
          workHours: 8,
          dailyRateSnapshot: 30000, // Already correct
          tenantEmail: TEST_TENANT_EMAIL
        }
      });
      
      const result = await syncWorkerSalarySnapshots(worker.id);
      
      expect(result.success).toBe(true);
      expect(result.skippedCount).toBeGreaterThan(0);
    });
  });

  describe('syncAllWorkersSalarySnapshots', () => {
    it('should sync all workers salary snapshots', async () => {
      // Create multiple test workers
      await createTestWorker();
      await testPrisma.workforceRegistry.create({
        data: {
          name: 'Test Worker 2',
          role: 'Builder',
          dailyRate: 28000,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });
      
      const result = await syncAllWorkersSalarySnapshots();
      
      expect(result.success).toBe(true);
      expect(result.totalWorkers).toBeGreaterThanOrEqual(2);
      expect(result.results).toBeDefined();
    });

    it('should handle empty worker list', async () => {
      const result = await syncAllWorkersSalarySnapshots();
      
      expect(result.success).toBe(true);
      expect(result.totalWorkers).toBe(0);
    });
  });

  describe('syncSalarySnapshotsAfterDate', () => {
    it('should sync snapshots after specific date', async () => {
      const worker = await createTestWorker();
      
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
      
      const workDiary = await testPrisma.workDiary.create({
        data: {
          workId: work.id,
          tenantEmail: TEST_TENANT_EMAIL,
          date: new Date()
        }
      });
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      await testPrisma.workDiaryItem.create({
        data: {
          workDiaryId: workDiary.id,
          workId: work.id,
          name: worker.name,
          date: futureDate,
          workHours: 8,
          dailyRateSnapshot: 25000,
          tenantEmail: TEST_TENANT_EMAIL
        }
      });
      
      const result = await syncSalarySnapshotsAfterDate(new Date());
      
      expect(result.success).toBe(true);
      expect(result.totalItems).toBeGreaterThan(0);
    });

    it('should handle no items after date', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const result = await syncSalarySnapshotsAfterDate(futureDate);
      
      expect(result.success).toBe(true);
      expect(result.totalItems).toBe(0);
    });
  });
});
