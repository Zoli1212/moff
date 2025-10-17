/**
 * User Management Actions Tests
 * Tests for user-management-actions.ts
 */

import { describe, it, expect, vi } from 'vitest';
import { testPrisma, TEST_TENANT_EMAIL } from './setup';
import { checkIsSuperUser, getAllUserEmails } from '@/actions/user-management-actions';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn().mockResolvedValue({
    id: 'test-clerk-id',
    emailAddresses: [{ emailAddress: TEST_TENANT_EMAIL }]
  })
}));

describe('User Management Actions Tests', () => {
  describe('checkIsSuperUser', () => {
    it('should return true for super user', async () => {
      await testPrisma.user.create({
        data: { email: TEST_TENANT_EMAIL, clerkId: 'test-clerk-id', name: 'Super User', isSuperUser: true }
      });
      
      const result = await checkIsSuperUser();
      
      expect(result.success).toBe(true);
      expect(result.isSuperUser).toBe(true);
    });

    it('should return false for regular user', async () => {
      await testPrisma.user.create({
        data: { email: TEST_TENANT_EMAIL, clerkId: 'test-clerk-id', name: 'Regular User', isSuperUser: false }
      });
      
      const result = await checkIsSuperUser();
      
      expect(result.success).toBe(true);
      expect(result.isSuperUser).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const result = await checkIsSuperUser();
      
      expect(result.success).toBe(true);
      expect(result.isSuperUser).toBe(false);
    });
  });

  describe('getAllUserEmails', () => {
    it('should return all user emails and users', async () => {
      await testPrisma.user.createMany({
        data: [
          { email: 'user1@test.com', clerkId: 'clerk-1', name: 'User 1', isSuperUser: false },
          { email: 'user2@test.com', clerkId: 'clerk-2', name: 'User 2', isSuperUser: false },
          { email: TEST_TENANT_EMAIL, clerkId: 'test-clerk-id', name: 'Test User', isSuperUser: true }
        ]
      });
      
      const result = await getAllUserEmails();
      
      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(2); // Excludes current user
      expect(result.emails).toHaveLength(2);
      expect(result.emails).toContain('user1@test.com');
      expect(result.emails).toContain('user2@test.com');
    });

    it('should return error when no super user', async () => {
      await testPrisma.user.create({
        data: { email: TEST_TENANT_EMAIL, clerkId: 'test-clerk-id', name: 'Regular User', isSuperUser: false }
      });
      
      const result = await getAllUserEmails();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nincs jogosultságod ehhez a művelethez');
    });

    it('should order users by email', async () => {
      await testPrisma.user.createMany({
        data: [
          { email: 'zebra@test.com', clerkId: 'clerk-z', name: 'Zebra', isSuperUser: false },
          { email: 'alpha@test.com', clerkId: 'clerk-a', name: 'Alpha', isSuperUser: false },
          { email: 'beta@test.com', clerkId: 'clerk-b', name: 'Beta', isSuperUser: false },
          { email: TEST_TENANT_EMAIL, clerkId: 'test-clerk-id', name: 'Test User', isSuperUser: true }
        ]
      });
      
      const result = await getAllUserEmails();
      
      expect(result.success).toBe(true);
      expect(result.emails?.[0]).toBe('alpha@test.com');
      expect(result.emails?.[1]).toBe('beta@test.com');
      expect(result.emails?.[2]).toBe('zebra@test.com');
    });
  });
});
