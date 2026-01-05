const { MEMBERSHIP_SEGMENT_ID } = require('../config/square');
const crypto = require('crypto');
const logger = require('../logger');

/**
 * Transform Square customer data to frontend SearchResult format
 * @param {Object} customer - Square customer object (snake_case)
 * @param {Object} membershipMeta - Optional membership metadata from cache
 * @param {boolean} includeMembershipMeta - Whether to include detailed membership info
 * @returns {Object} SearchResult (camelCase)
 */
function transformCustomer(customer, membershipMeta = null, includeMembershipMeta = false) {
  if (!customer || !customer.id) {
    throw new Error('Invalid customer data: missing id');
  }

  // Generate customer hash (for caching/deduplication if needed)
  const customerHash = crypto
    .createHash('md5')
    .update(JSON.stringify({
      id: customer.id,
      email: customer.email_address,
      phone: customer.phone_number
    }))
    .digest('hex');

  // Build display name from given_name and family_name
  const givenName = customer.given_name || '';
  const familyName = customer.family_name || '';
  const displayName = `${givenName} ${familyName}`.trim() || 'Unknown';

  // Transform contact info
  const contact = {
    email: customer.email_address || undefined,
    phone: customer.phone_number || undefined,
    lotNumber: customer.reference_id || undefined
  };

  // Build membership info
  const membership = buildMembershipInfo(customer, membershipMeta, includeMembershipMeta);

  return {
    customerHash,
    customerId: customer.id,
    displayName,
    contact,
    membership
  };
}

/**
 * Build membership info from customer and membership metadata
 * @param {Object} customer - Square customer object
 * @param {Object} membershipMeta - Membership metadata from cache or service
 * @param {boolean} includeMembershipMeta - Whether to include detailed metadata
 * @returns {Object} Membership info object
 */
function buildMembershipInfo(customer, membershipMeta = null, includeMembershipMeta = false) {
  // Determine membership type
  const hasMembership = membershipMeta?.hasMembership || false;
  const segmentIds = customer.segment_ids || [];
  const hasSegmentMembership = segmentIds.includes(MEMBERSHIP_SEGMENT_ID);

  // Determine verified via method
  let verifiedVia = 'none';
  if (hasMembership) {
    if (membershipMeta?.catalogItemId && membershipMeta?.variantId) {
      verifiedVia = 'order';
    } else if (hasSegmentMembership) {
      verifiedVia = 'segment';
    }
    
    // If both catalog item and segment, mark as both
    if (membershipMeta?.catalogItemId && hasSegmentMembership) {
      verifiedVia = 'segment_and_order';
    }
  } else if (hasSegmentMembership) {
    // Has segment but not confirmed via order
    verifiedVia = 'segment';
  }

  // Get membership type string
  const membershipType = (hasMembership || hasSegmentMembership) ? 'Member' : 'Non-Member';

  // Get segment ID (use configured segment or first segment if available)
  const segmentId = hasSegmentMembership 
    ? MEMBERSHIP_SEGMENT_ID 
    : (segmentIds[0] || '');

  // Get lastVerifiedAt from cache or current time
  let lastVerifiedAt = new Date().toISOString();
  if (membershipMeta?.lastVerifiedAt) {
    lastVerifiedAt = membershipMeta.lastVerifiedAt;
  } else if (membershipMeta?.fromCache === true) {
    // If from cache, use cache timestamp if available
    // This will be set when getting from cache entry
    lastVerifiedAt = membershipMeta.lastVerifiedAt || new Date().toISOString();
  }

  // Build base membership object
  const membership = {
    type: membershipType,
    segmentId: segmentId,
    lastVerifiedAt: lastVerifiedAt,
    verifiedVia: verifiedVia
  };

  // Add optional fields if detailed metadata is requested
  if (includeMembershipMeta && membershipMeta) {
    if (membershipMeta.membershipPurchaseDate) {
      membership.membershipPurchaseDate = membershipMeta.membershipPurchaseDate;
    }
  }

  return membership;
}

/**
 * Transform Square order line item to frontend OrderLineItem format
 * @param {Object} item - Square order line item (snake_case)
 * @returns {Object} OrderLineItem (camelCase)
 */
function transformOrderLineItem(item) {
  if (!item) {
    return null;
  }

  return {
    uid: item.uid || undefined,
    catalogObjectId: item.catalog_object_id || undefined,
    name: item.name || undefined,
    variationName: item.variation_name || undefined,
    quantity: item.quantity || undefined,
    basePriceMoney: item.base_price_money ? {
      amount: item.base_price_money.amount,
      currency: item.base_price_money.currency
    } : undefined,
    totalMoney: item.total_money ? {
      amount: item.total_money.amount,
      currency: item.total_money.currency
    } : undefined
  };
}

/**
 * Transform Square order to frontend OrderDetails format
 * @param {Object} order - Square order object (snake_case)
 * @returns {Object} OrderDetails (camelCase)
 */
function transformOrder(order) {
  if (!order || !order.id) {
    throw new Error('Invalid order data: missing id');
  }

  return {
    id: order.id,
    locationId: order.location_id || '',
    state: order.state || undefined,
    createdAt: order.created_at || undefined,
    lineItems: (order.line_items || []).map(transformOrderLineItem).filter(Boolean),
    totalMoney: order.total_money ? {
      amount: order.total_money.amount,
      currency: order.total_money.currency
    } : undefined,
    accessVerified: order.accessVerified || false
  };
}

/**
 * Transform Square order line item to CustomerOrder line item format
 * @param {Object} item - Square order line item (snake_case)
 * @returns {Object} CustomerOrder line item (camelCase)
 */
function transformCustomerOrderLineItem(item) {
  if (!item) {
    return null;
  }

  return {
    uid: item.uid || undefined,
    catalogObjectId: item.catalog_object_id || undefined,
    catalogObjectVariantId: item.catalog_object_variant_id || undefined,
    name: item.name || undefined,
    variationName: item.variation_name || undefined,
    quantity: item.quantity || undefined,
    grossSalesMoney: item.gross_sales_money ? {
      amount: item.gross_sales_money.amount,
      currency: item.gross_sales_money.currency
    } : undefined,
    totalMoney: item.total_money ? {
      amount: item.total_money.amount,
      currency: item.total_money.currency
    } : undefined
  };
}

/**
 * Transform Square order to frontend CustomerOrder format
 * @param {Object} order - Square order object (snake_case)
 * @returns {Object} CustomerOrder (camelCase)
 */
function transformCustomerOrder(order) {
  if (!order || !order.id) {
    throw new Error('Invalid order data: missing id');
  }

  return {
    id: order.id,
    createdAt: order.created_at || undefined,
    state: order.state || undefined,
    lineItems: (order.line_items || []).map(transformCustomerOrderLineItem).filter(Boolean),
    totalMoney: order.total_money ? {
      amount: order.total_money.amount,
      currency: order.total_money.currency
    } : undefined
  };
}

module.exports = {
  transformCustomer,
  transformOrder,
  transformOrderLineItem,
  transformCustomerOrder,
  transformCustomerOrderLineItem,
  buildMembershipInfo
};

