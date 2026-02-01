const { initDatabase } = require('../db/database');
const logger = require('../logger');

/**
 * Service for managing customer segments we care about (Square segment ID + display name).
 * Membership is derived from which of these segments a customer is in.
 */
class SegmentService {
  constructor(db = null) {
    this.db = db || initDatabase();
  }

  /**
   * Get all configured segments, ordered by sort_order then display_name
   * @returns {Array<{id: number, segment_id: string, display_name: string, sort_order: number}>}
   */
  getSegments() {
    try {
      const rows = this.db.prepare(`
        SELECT id, segment_id, display_name, sort_order
        FROM customer_segments
        ORDER BY sort_order ASC, display_name ASC
      `).all();
      return rows;
    } catch (error) {
      logger.error('Error getting segments:', error);
      return [];
    }
  }

  /**
   * Get configured segment IDs (Square IDs we use for membership)
   * @returns {string[]}
   */
  getConfiguredSegmentIds() {
    return this.getSegments().map(s => s.segment_id);
  }

  /**
   * Get display name for a segment ID
   * @param {string} segmentId - Square segment ID
   * @returns {string|null}
   */
  getDisplayName(segmentId) {
    const row = this.db.prepare(`
      SELECT display_name FROM customer_segments WHERE segment_id = ?
    `).get(segmentId);
    return row ? row.display_name : null;
  }

  /**
   * Map segment IDs to display names (only for configured segments)
   * @param {string[]} segmentIds
   * @returns {string[]} Display names in same order as segmentIds
   */
  getDisplayNamesForSegmentIds(segmentIds) {
    if (!segmentIds || segmentIds.length === 0) return [];
    const segments = this.getSegments();
    const byId = new Map(segments.map(s => [s.segment_id, s.display_name]));
    return segmentIds.map(id => byId.get(id) || id);
  }

  /**
   * Add a segment
   * @param {string} segmentId - Square segment ID (e.g. gv2:...)
   * @param {string} displayName - User-friendly name
   * @param {number} sortOrder - Optional sort order (default 0)
   * @returns {Object} Created segment
   */
  addSegment(segmentId, displayName, sortOrder = 0) {
    if (!segmentId || !displayName) {
      throw new Error('segment_id and display_name are required');
    }
    try {
      this.db.prepare(`
        INSERT INTO customer_segments (segment_id, display_name, sort_order)
        VALUES (?, ?, ?)
      `).run(segmentId, String(displayName).trim(), sortOrder == null ? 0 : Number(sortOrder));
      const row = this.db.prepare(`
        SELECT id, segment_id, display_name, sort_order FROM customer_segments WHERE segment_id = ?
      `).get(segmentId);
      logger.info(`Segment added: ${segmentId} (${displayName})`);
      return row;
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE')) {
        throw new Error(`Segment ${segmentId} already exists`);
      }
      logger.error('Error adding segment:', error);
      throw error;
    }
  }

  /**
   * Update a segment's display name and/or sort order
   * @param {string} segmentId - Square segment ID
   * @param {Object} updates - { display_name?: string, sort_order?: number }
   * @returns {Object} Updated segment
   */
  updateSegment(segmentId, updates = {}) {
    if (!segmentId) throw new Error('segment_id is required');
    const { display_name: displayName, sort_order: sortOrder } = updates;
    try {
      const setClauses = [];
      const values = [];
      if (displayName !== undefined) {
        setClauses.push('display_name = ?');
        values.push(String(displayName).trim());
      }
      if (sortOrder !== undefined) {
        setClauses.push('sort_order = ?');
        values.push(Number(sortOrder));
      }
      if (setClauses.length === 0) {
        return this.db.prepare(`
          SELECT id, segment_id, display_name, sort_order FROM customer_segments WHERE segment_id = ?
        `).get(segmentId);
      }
      values.push(segmentId);
      this.db.prepare(`
        UPDATE customer_segments SET ${setClauses.join(', ')} WHERE segment_id = ?
      `).run(...values);
      const row = this.db.prepare(`
        SELECT id, segment_id, display_name, sort_order FROM customer_segments WHERE segment_id = ?
      `).get(segmentId);
      logger.info(`Segment updated: ${segmentId}`);
      return row;
    } catch (error) {
      logger.error('Error updating segment:', error);
      throw error;
    }
  }

  /**
   * Delete a segment
   * @param {string} segmentId - Square segment ID
   */
  deleteSegment(segmentId) {
    if (!segmentId) throw new Error('segment_id is required');
    try {
      const result = this.db.prepare(`
        DELETE FROM customer_segments WHERE segment_id = ?
      `).run(segmentId);
      if (result.changes === 0) {
        throw new Error(`Segment ${segmentId} not found`);
      }
      logger.info(`Segment deleted: ${segmentId}`);
    } catch (error) {
      logger.error('Error deleting segment:', error);
      throw error;
    }
  }

  close() {
    if (this.db) this.db.close();
  }
}

module.exports = SegmentService;
