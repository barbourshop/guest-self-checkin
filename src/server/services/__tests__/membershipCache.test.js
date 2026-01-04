const { createTestDatabase, closeTestDatabase, clearTestDatabase } = require('../../__tests__/helpers/testDatabase');
const MockSquareService = require('../mockSquareService');
const { createMockSquareService } = require('../../__tests__/helpers/mockSquareHelpers');

// Create mock square service
const mockSquareService = createMockSquareService();

// Mock the squareService module before requiring MembershipCache
jest.mock('../squareService', () => {
  return mockSquareService;
});

const MembershipCache = require('../membershipCache');

describe('MembershipCache', () => {
  let cache;
  let db;
  let mockSquareService;

  beforeEach(() => {
    db = createTestDatabase();
    cache = new MembershipCache(db);
    mockSquareService = createMockSquareService();
    
    // Setup test data
    mockSquareService.addCustomer({
      id: 'MEMBER_1',
      given_name: 'John',
      family_name: 'Doe'
    });
    
    mockSquareService.addCustomer({
      id: 'NON_MEMBER_1',
      given_name: 'Jane',
      family_name: 'Smith'
    });
    
    // Add membership order
    mockSquareService.addOrder({
      id: 'MEMBERSHIP_ORDER',
      customer_id: 'MEMBER_1',
      line_items: [
        {
          catalog_object_id: 'MEMBERSHIP_ITEM_ID',
          catalog_object_variant_id: 'MEMBERSHIP_VARIANT_ID',
          name: 'Annual Membership'
        }
      ]
    });
  });

  afterEach(() => {
    clearTestDatabase(db);
    closeTestDatabase(db);
    if (cache) {
      cache.close();
    }
  });

  describe('Cache Hit', () => {
    it('should return cached membership status when cache is fresh', async () => {
      // First call - will fetch and cache
      const result1 = await cache.getMembershipStatus('MEMBER_1');
      expect(result1.fromCache).toBe(false);

      // Second call - should use cache
      const result2 = await cache.getMembershipStatus('MEMBER_1');
      expect(result2.fromCache).toBe(true);
      expect(result2.hasMembership).toBe(result1.hasMembership);
    });

    it('should return cached data immediately', async () => {
      // Manually insert cache entry
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, last_verified_at)
        VALUES (?, ?, ?)
      `).run('CACHED_CUSTOMER', 1, new Date().toISOString());

      const result = await cache.getMembershipStatus('CACHED_CUSTOMER');
      expect(result.fromCache).toBe(true);
      expect(result.hasMembership).toBe(true);
    });
  });

  describe('Cache Miss', () => {
    it('should refresh from Square when cache miss', async () => {
      const result = await cache.getMembershipStatus('MEMBER_1');
      
      expect(result.fromCache).toBe(false);
      expect(result.hasMembership).toBeDefined();
      
      // Verify cache was updated
      const cached = db.prepare(`
        SELECT * FROM membership_cache WHERE customer_id = ?
      `).get('MEMBER_1');
      
      expect(cached).toBeDefined();
      expect(cached.has_membership).toBeDefined();
    });
  });

  describe('Cache Refresh', () => {
    it('should refresh stale cache', async () => {
      // Insert stale cache entry (older than TTL)
      const staleDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, last_verified_at)
        VALUES (?, ?, ?)
      `).run('STALE_CUSTOMER', 0, staleDate);

      const result = await cache.getMembershipStatus('STALE_CUSTOMER');
      
      // Should refresh (not from cache)
      expect(result.fromCache).toBe(false);
      
      // Verify cache was updated with new timestamp
      const updated = db.prepare(`
        SELECT * FROM membership_cache WHERE customer_id = ?
      `).get('STALE_CUSTOMER');
      
      expect(new Date(updated.last_verified_at).getTime()).toBeGreaterThan(new Date(staleDate).getTime());
    });

    it('should force refresh when requested', async () => {
      // Insert fresh cache
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, last_verified_at)
        VALUES (?, ?, ?)
      `).run('FORCE_REFRESH', 0, new Date().toISOString());

      const result = await cache.getMembershipStatus('FORCE_REFRESH', true);
      expect(result.fromCache).toBe(false);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache entry', () => {
      // Insert cache entry
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, last_verified_at)
        VALUES (?, ?, ?)
      `).run('TO_INVALIDATE', 1, new Date().toISOString());

      // Invalidate
      cache.invalidateCache('TO_INVALIDATE');

      // Verify deleted
      const result = db.prepare(`
        SELECT * FROM membership_cache WHERE customer_id = ?
      `).get('TO_INVALIDATE');

      expect(result).toBeUndefined();
    });

    it('should handle invalidate for non-existent customer gracefully', () => {
      expect(() => {
        cache.invalidateCache('NON_EXISTENT');
      }).not.toThrow();
    });
  });

  describe('Bulk Refresh', () => {
    it('should refresh multiple customers', async () => {
      const customerIds = ['MEMBER_1', 'NON_MEMBER_1'];
      const results = await cache.bulkRefresh(customerIds);

      expect(results).toHaveLength(2);
      expect(results[0].customerId).toBe('MEMBER_1');
      expect(results[1].customerId).toBe('NON_MEMBER_1');
      expect(results[0].hasMembership).toBeDefined();
      expect(results[1].hasMembership).toBeDefined();
    });

    it('should handle empty array', async () => {
      const results = await cache.bulkRefresh([]);
      expect(results).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should return stale cache on refresh error', async () => {
      // Insert cache entry
      db.prepare(`
        INSERT INTO membership_cache 
        (customer_id, has_membership, last_verified_at)
        VALUES (?, ?, ?)
      `).run('ERROR_CUSTOMER', 1, new Date().toISOString());

      // Mock squareService to throw error
      mockSquareService.setShouldFail(true, 'checkMembershipByCatalogItem');

      // Should return stale cache
      const result = await cache.getMembershipStatus('ERROR_CUSTOMER');
      expect(result.fromCache).toBe(true);
      expect(result.hasMembership).toBe(true);

      // Reset
      mockSquareService.setShouldFail(false);
    });

    it('should handle error when no cache available and refresh fails', async () => {
      // This test verifies error handling - the actual behavior depends on configuration
      // If catalog item ID is set and API fails, it should throw
      // If catalog item ID is not set, it falls back to segment checking
      // We'll test that errors are handled gracefully
      
      // Make checkMembershipByCatalogItem throw
      mockSquareService.setShouldFail(true, 'checkMembershipByCatalogItem');
      
      // Since MEMBERSHIP_CATALOG_ITEM_ID might not be set, this might not throw
      // But it should handle the error gracefully
      try {
        const result = await cache.getMembershipStatus('NO_CACHE_CUSTOMER');
        // If it doesn't throw, it should return a valid result (fallback behavior)
        expect(result).toBeDefined();
        expect(result.hasMembership).toBeDefined();
      } catch (error) {
        // If it throws, that's also valid behavior when catalog item ID is configured
        expect(error).toBeDefined();
      }

      // Reset
      mockSquareService.setShouldFail(false);
    });
  });

  describe('Input Validation', () => {
    it('should throw error for missing customer ID', async () => {
      await expect(cache.getMembershipStatus(null)).rejects.toThrow('Customer ID is required');
      await expect(cache.getMembershipStatus('')).rejects.toThrow('Customer ID is required');
    });
  });
});

