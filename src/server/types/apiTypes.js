/**
 * @fileoverview Type definitions matching frontend TypeScript types
 * These JSDoc types ensure backend API responses match frontend expectations
 */

/**
 * @typedef {Object} SearchRequestPayload
 * @property {Object} query - Search query parameters
 * @property {'phone' | 'email' | 'lot'} query.type - Type of search
 * @property {string} query.value - Search value
 * @property {boolean} [query.fuzzy] - Whether to use fuzzy matching
 * @property {boolean} [includeMembershipMeta] - Whether to include detailed membership metadata
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} [customerHash] - Hash of customer data for deduplication
 * @property {string} [customerId] - Square customer ID
 * @property {string} displayName - Customer display name (from given_name + family_name)
 * @property {Object} membership - Membership information
 * @property {string} membership.type - Membership type (e.g., "Member", "Non-Member")
 * @property {string} membership.segmentId - Square segment ID
 * @property {string} membership.lastVerifiedAt - ISO timestamp of last verification
 * @property {'segment' | 'order' | 'segment_and_order' | 'none'} [membership.verifiedVia] - How membership was verified
 * @property {string|null} [membership.membershipPurchaseDate] - Date of membership purchase (if available)
 * @property {Object} contact - Contact information
 * @property {string} [contact.email] - Email address
 * @property {string} [contact.phone] - Phone number
 * @property {string} [contact.lotNumber] - Lot number (reference_id)
 */

/**
 * @typedef {Object} PassValidationPayload
 * @property {string} token - Order ID token
 * @property {string} [deviceId] - Device ID (optional)
 */

/**
 * @typedef {Object} OrderLineItem
 * @property {string} [uid] - Line item UID
 * @property {string} [catalogObjectId] - Catalog object ID
 * @property {string} [name] - Item name
 * @property {string} [variationName] - Variation name
 * @property {string} [quantity] - Quantity
 * @property {Object} [basePriceMoney] - Base price money
 * @property {number} [basePriceMoney.amount] - Amount in cents
 * @property {string} [basePriceMoney.currency] - Currency code
 * @property {Object} [totalMoney] - Total money
 * @property {number} [totalMoney.amount] - Amount in cents
 * @property {string} [totalMoney.currency] - Currency code
 */

/**
 * @typedef {Object} OrderDetails
 * @property {string} id - Order ID
 * @property {string} locationId - Location ID
 * @property {string} [state] - Order state
 * @property {string} [createdAt] - ISO timestamp of creation
 * @property {OrderLineItem[]} lineItems - Array of line items
 * @property {Object} [totalMoney] - Total money
 * @property {number} [totalMoney.amount] - Amount in cents
 * @property {string} [totalMoney.currency] - Currency code
 * @property {boolean} [accessVerified] - Whether access is verified
 */

/**
 * @typedef {Object} PassValidationResponse
 * @property {string} status - Validation status ('valid' | 'invalid')
 * @property {OrderDetails} order - Order details (null if invalid)
 */

/**
 * @typedef {Object} CustomerOrderLineItem
 * @property {string} [uid] - Line item UID
 * @property {string} [catalogObjectId] - Catalog object ID
 * @property {string} [catalogObjectVariantId] - Catalog object variant ID
 * @property {string} [name] - Item name
 * @property {string} [variationName] - Variation name
 * @property {string} [quantity] - Quantity
 * @property {Object} [grossSalesMoney] - Gross sales money
 * @property {number} [grossSalesMoney.amount] - Amount in cents
 * @property {string} [grossSalesMoney.currency] - Currency code
 * @property {Object} [totalMoney] - Total money
 * @property {number} [totalMoney.amount] - Amount in cents
 * @property {string} [totalMoney.currency] - Currency code
 */

/**
 * @typedef {Object} CustomerOrder
 * @property {string} id - Order ID
 * @property {string} [createdAt] - ISO timestamp of creation
 * @property {string} [state] - Order state
 * @property {CustomerOrderLineItem[]} lineItems - Array of line items
 * @property {Object} [totalMoney] - Total money
 * @property {number} [totalMoney.amount] - Amount in cents
 * @property {string} [totalMoney.currency] - Currency code
 */

/**
 * @typedef {Object} CustomerOrdersResponse
 * @property {CustomerOrder[]} orders - Array of customer orders
 */

module.exports = {
  // Types are exported for reference but JSDoc handles documentation
};


