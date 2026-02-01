/**
 * Jest setupFiles for backend tests - runs before any test file is loaded.
 * Sets env vars required by config/square so check-in verification doesn't fail in CI.
 */
process.env.CHECKIN_CATALOG_ITEM_ID = process.env.CHECKIN_CATALOG_ITEM_ID || 'CHECKIN_CATALOG_ITEM_ID';
process.env.CHECKIN_VARIANT_ID = process.env.CHECKIN_VARIANT_ID || 'CHECKIN_VARIANT_ID';
