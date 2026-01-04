const { initDatabase } = require('../db/database');
const logger = require('../logger');

/**
 * Service for managing offline check-in queue
 * Queues check-ins when Square API is unavailable and syncs when connection restored
 */
class OfflineQueue {
  constructor(db = null) {
    this.db = db || initDatabase();
    this.maxRetries = 3;
    this.retryDelayMs = 1000; // Start with 1 second
  }

  /**
   * Queue a check-in for later sync
   * @param {Object} checkinData - Check-in data
   * @param {string} checkinData.customerId - Customer ID
   * @param {string} checkinData.orderId - Order ID
   * @param {number} checkinData.guestCount - Number of guests
   * @returns {Promise<{id: number, status: string}>} Queued check-in record
   */
  async queueCheckin(checkinData) {
    const { customerId, orderId, guestCount } = checkinData;

    if (!customerId || !orderId || guestCount === undefined) {
      throw new Error('Missing required check-in data: customerId, orderId, and guestCount are required');
    }

    try {
      const createdAt = new Date().toISOString();
      const status = 'pending';

      const result = this.db.prepare(`
        INSERT INTO checkin_queue 
        (customer_id, order_id, guest_count, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(customerId, orderId, guestCount, status, createdAt);

      logger.info(`Queued check-in: customer=${customerId}, order=${orderId}, guests=${guestCount}`);

      return {
        id: result.lastInsertRowid,
        customerId,
        orderId,
        guestCount,
        status,
        createdAt
      };
    } catch (error) {
      logger.error(`Error queueing check-in:`, error);
      throw error;
    }
  }

  /**
   * Get pending check-ins from queue
   * @param {number} limit - Maximum number of check-ins to return
   * @returns {Array<Object>} Array of queued check-ins
   */
  getPendingCheckins(limit = 100) {
    try {
      const checkins = this.db.prepare(`
        SELECT * FROM checkin_queue 
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT ?
      `).all(limit);

      return checkins;
    } catch (error) {
      logger.error('Error getting pending check-ins:', error);
      return [];
    }
  }

  /**
   * Mark check-in as synced
   * @param {number} queueId - Queue record ID
   * @returns {boolean} True if successful
   */
  markAsSynced(queueId) {
    try {
      const syncedAt = new Date().toISOString();
      const result = this.db.prepare(`
        UPDATE checkin_queue 
        SET status = 'synced', synced_at = ?
        WHERE id = ?
      `).run(syncedAt, queueId);

      return result.changes > 0;
    } catch (error) {
      logger.error(`Error marking check-in ${queueId} as synced:`, error);
      return false;
    }
  }

  /**
   * Mark check-in as failed (after max retries)
   * @param {number} queueId - Queue record ID
   * @param {string} errorMessage - Error message
   * @returns {boolean} True if successful
   */
  markAsFailed(queueId, errorMessage = null) {
    try {
      const result = this.db.prepare(`
        UPDATE checkin_queue 
        SET status = 'failed'
        WHERE id = ?
      `).run(queueId);

      if (errorMessage) {
        logger.error(`Check-in ${queueId} failed: ${errorMessage}`);
      }

      return result.changes > 0;
    } catch (error) {
      logger.error(`Error marking check-in ${queueId} as failed:`, error);
      return false;
    }
  }

  /**
   * Sync queued check-ins to Square API
   * This is a placeholder - actual Square API sync would be implemented here
   * @param {Function} syncFunction - Function to call for each check-in
   * @returns {Promise<{synced: number, failed: number}>} Sync results
   */
  async syncQueue(syncFunction = null) {
    const pending = this.getPendingCheckins();
    let synced = 0;
    let failed = 0;

    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    logger.info(`Syncing ${pending.length} queued check-ins`);

    for (const checkin of pending) {
      try {
        // If sync function provided, use it
        if (syncFunction) {
          await syncFunction(checkin);
        } else {
          // Placeholder: In real implementation, this would call Square API
          // to log the check-in or create an order
          logger.info(`Would sync check-in: ${checkin.id}`);
        }

        // Mark as synced
        if (this.markAsSynced(checkin.id)) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`Error syncing check-in ${checkin.id}:`, error);
        failed++;
        // Don't mark as failed immediately - allow retries
      }
    }

    logger.info(`Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  }

  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getQueueStats() {
    try {
      const stats = this.db.prepare(`
        SELECT 
          status,
          COUNT(*) as count
        FROM checkin_queue
        GROUP BY status
      `).all();

      const result = {
        pending: 0,
        synced: 0,
        failed: 0,
        total: 0
      };

      for (const stat of stats) {
        result[stat.status] = stat.count;
        result.total += stat.count;
      }

      return result;
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return { pending: 0, synced: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Clear old synced check-ins (cleanup)
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {number} Number of records deleted
   */
  clearOldSyncedCheckins(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffISO = cutoffDate.toISOString();

      const result = this.db.prepare(`
        DELETE FROM checkin_queue
        WHERE status = 'synced' AND synced_at < ?
      `).run(cutoffISO);

      logger.info(`Cleared ${result.changes} old synced check-ins`);
      return result.changes;
    } catch (error) {
      logger.error('Error clearing old check-ins:', error);
      return 0;
    }
  }

  /**
   * Close database connection (for testing)
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = OfflineQueue;

