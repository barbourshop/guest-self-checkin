const { initDatabase } = require('../db/database');
const logger = require('../logger');

/**
 * Service for managing application configuration
 * Stores config in database, falls back to environment variables
 */
class ConfigService {
  constructor(db = null) {
    this.db = db || initDatabase();
  }

  /**
   * Get a configuration value
   * Checks database first, then falls back to environment variable
   * @param {string} key - Configuration key
   * @param {string} defaultValue - Default value if not found
   * @returns {string} Configuration value
   */
  get(key, defaultValue = '') {
    try {
      // Check database first
      const result = this.db.prepare(`
        SELECT value FROM app_config WHERE key = ?
      `).get(key);

      if (result) {
        return result.value;
      }

      // Fall back to environment variable
      return process.env[key] || defaultValue;
    } catch (error) {
      logger.error(`Error getting config ${key}:`, error);
      return process.env[key] || defaultValue;
    }
  }

  /**
   * Set a configuration value (saves to database)
   * @param {string} key - Configuration key
   * @param {string} value - Configuration value
   */
  set(key, value) {
    try {
      const updatedAt = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO app_config (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = ?,
          updated_at = ?
      `).run(key, value, updatedAt, value, updatedAt);
      
      logger.info(`Config updated: ${key}`);
    } catch (error) {
      logger.error(`Error setting config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all configuration values
   * Returns both database values and environment variable values
   * @returns {Object} Configuration object
   */
  getAll() {
    try {
      const dbConfig = this.db.prepare(`
        SELECT key, value, updated_at FROM app_config
      `).all();

      const config = {};
      
      // Load from database
      dbConfig.forEach(row => {
        config[row.key] = {
          value: row.value,
          source: 'database',
          updatedAt: row.updated_at
        };
      });

      // Add environment variables (only if not in database)
      const envKeys = [
        'MEMBERSHIP_SEGMENT_ID',
        'MEMBERSHIP_CATALOG_ITEM_ID',
        'MEMBERSHIP_VARIANT_ID',
        'CHECKIN_CATALOG_ITEM_ID',
        'CHECKIN_VARIANT_ID',
        'BULK_REFRESH_CONCURRENCY',
        'BULK_REFRESH_RATE_LIMIT_MS',
        'BULK_REFRESH_REQUEST_DELAY_MS',
        'CACHE_REFRESH_AGE_HOURS',
        'SQUARE_API_URL',
        'SQUARE_API_VERSION'
      ];

      envKeys.forEach(key => {
        if (!config[key] && process.env[key]) {
          config[key] = {
            value: process.env[key],
            source: 'environment',
            updatedAt: null
          };
        }
      });

      return config;
    } catch (error) {
      logger.error('Error getting all config:', error);
      return {};
    }
  }

  /**
   * Get effective configuration (database overrides env vars)
   * @returns {Object} Effective configuration values
   */
  getEffective() {
    const all = this.getAll();
    const effective = {};
    
    Object.keys(all).forEach(key => {
      effective[key] = all[key].value;
    });

    return effective;
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

module.exports = ConfigService;
