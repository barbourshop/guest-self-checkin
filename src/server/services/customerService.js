const squareService = require('./squareService');
const MembershipCache = require('./membershipCache');

/**
 * Service handling customer-related operations
 * @class CustomerService
 */
class CustomerService {
  constructor() {
    this.membershipCache = new MembershipCache();
  }

  /**
   * Get customer by ID with enriched data
   * @param {string} customerId - The customer ID
   * @returns {Promise<Object|null>} The enriched customer object or null if not found
   */
  async getCustomerById(customerId) {
    try {
      // Get the raw customer data from Square API
      const customer = await squareService.getCustomer(customerId);
      
      // Check membership status using cache
      const membershipStatus = await this.membershipCache.getMembershipStatus(customerId);
      const hasMembership = membershipStatus.hasMembership;
      
      // Enrich the customer data with membership status
      return {
        ...customer,
        membershipType: hasMembership ? 'Member' : 'Non-Member'
      };
    } catch (error) {
      console.error('Error getting customer by ID:', error);
      return null;
    }
  }

  /**
   * Search for customers with enriched data
   * Supports: email, phone, lot, name, address
   * @param {string} searchType - Type of search (email, phone, lot, name, address)
   * @param {string} searchValue - Value to search for
   * @param {boolean} fuzzy - Whether to use fuzzy matching (default: true)
   * @returns {Promise<Array<Object>>} Array of enriched customer objects
   */
  async searchCustomers(searchType, searchValue, fuzzy = true) {
    const fs = require('fs');
    const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';
    
    // #region agent log
    fs.appendFileSync(logPath, JSON.stringify({location:'customerService.js:searchCustomers:entry',message:'CustomerService.searchCustomers called',data:{searchType,searchValue,fuzzy},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
    // #endregion

    try {
      // Get raw customer data from Square API
      const customers = await squareService.searchCustomers(searchType, searchValue, fuzzy);
      
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerService.js:searchCustomers:after-square',message:'Square service returned',data:{customersCount:customers.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
      // #endregion
      
      // Enrich each customer with membership (from cache)
      const enrichedCustomers = await Promise.all(
        customers.map(async (customer) => {
          // Use cache for membership status
          const membershipStatus = await this.membershipCache.getMembershipStatus(customer.id);
          const hasMembership = membershipStatus.hasMembership;
          
          return {
            ...customer,
            membershipType: hasMembership ? 'Member' : 'Non-Member'
          };
        })
      );
      
      return enrichedCustomers;
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  }

  /**
   * Unified search - auto-detects search type from input
   * @param {string} query - Search query (could be email, phone, name, address, lot, or order ID)
   * @returns {Promise<{type: string, results: Array<Object>}>} Search results
   */
  async unifiedSearch(query, isQRMode = false) {
    if (!query || typeof query !== 'string') {
      return { type: 'search', results: [] };
    }

    const trimmed = query.trim();

    // Check if it looks like an order ID (QR code) - regardless of mode
    // Square order IDs are typically alphanumeric and 10+ characters
    const orderIdPattern = /^[A-Z0-9]{10,}$/i;
    if (orderIdPattern.test(trimmed) && trimmed.length >= 10) {
      // This is a QR code - return special type
      return { type: 'qr', orderId: trimmed, results: [] };
    }

    // If in QR mode, treat everything as QR code (might be a partial scan)
    if (isQRMode) {
      return { type: 'qr', orderId: trimmed, results: [] };
    }

    // Manual search mode - auto-detect search type
    let searchType = 'name'; // Default to name search
    
    const fs = require('fs');
    const logPath = '/Users/mbarbo000/Documents/Projects/guest-self-checkin/.cursor/debug.log';
    
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerService.js:unifiedSearch:before-detection',message:'Starting type detection',data:{trimmed,isQRMode},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n');
      // #endregion
    
    // Check for email pattern
    if (trimmed.includes('@') && trimmed.includes('.')) {
      searchType = 'email';
    }
    // Check for phone pattern (digits, possibly with formatting)
    else if (/^[\d\s\-\(\)\+]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 10) {
      searchType = 'phone';
    }
    // Check for lot number pattern (format like "BTV 1.111" or "BTV1.111" - alphanumeric with optional spaces and dots)
    // Pattern 1: Letters followed by optional space and numbers with optional dot (e.g., "BTV 1.111", "BTV1.111")
    // Pattern 2: Very short alphanumeric (1-3 chars) that are all digits (likely lot codes)
    // Pattern 3: Contains numbers with dots (e.g., "1.111", "A1.2")
    // Exclude long alphanumeric strings (10+ chars) as they're likely QR codes
    else if (
      trimmed.length < 10 && (  // Lot numbers are typically short
        /^[A-Z]{2,}\s*\d+\.?\d*$/i.test(trimmed) ||  // "BTV 1.111" or "BTV1.111" format
        (/^[A-Z0-9]{1,3}$/i.test(trimmed) && /^\d+$/.test(trimmed)) ||  // All digits, 1-3 chars
        /^\d+\.\d+/.test(trimmed) ||  // Numbers with dot (e.g., "1.111")
        (/^[A-Z]{1,2}\d+\.?\d*$/i.test(trimmed) && trimmed.length <= 8)  // Short alphanumeric with numbers (e.g., "A1.2", "BTV1.111")
      )
    ) {
      searchType = 'lot';
    }
    // If it contains letters, treat as name
    else if (/[A-Za-z]/.test(trimmed)) {
      searchType = 'name';
    }
    // Otherwise treat as name (default)

      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerService.js:unifiedSearch:after-detection',message:'Type detection complete',data:{searchType,trimmed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'}) + '\n');
      // #endregion

    // Perform search
    const results = await this.searchCustomers(searchType, trimmed);
    
      // #region agent log
      fs.appendFileSync(logPath, JSON.stringify({location:'customerService.js:unifiedSearch:after-search',message:'Search complete',data:{searchType,resultsCount:results.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'}) + '\n');
      // #endregion
    
    return { type: searchType, results };
  }

}

module.exports = new CustomerService(); 