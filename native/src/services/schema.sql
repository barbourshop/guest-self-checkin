-- Customer segments configuration (Square segments)
CREATE TABLE IF NOT EXISTS customer_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

-- Customer groups configuration (Square groups) - NEW
CREATE TABLE IF NOT EXISTS customer_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

-- Membership cache table
-- Stores cached membership and customer details from Square
-- Contains both segment_ids and group_ids (JSON arrays as TEXT)
CREATE TABLE IF NOT EXISTS membership_cache (
  customer_id TEXT PRIMARY KEY,
  has_membership INTEGER NOT NULL,
  segment_ids TEXT,           -- JSON array: ["seg1", "seg2"]
  group_ids TEXT,             -- JSON array: ["grp1", "grp2"] - NEW
  last_verified_at TEXT NOT NULL,
  given_name TEXT,
  family_name TEXT,
  email_address TEXT,
  phone_number TEXT,
  reference_id TEXT,
  address_line_1 TEXT,
  locality TEXT,
  postal_code TEXT
);

-- Check-in queue table
-- Stores check-ins that need to be synced to cloud (Google Sheets, etc.)
CREATE TABLE IF NOT EXISTS checkin_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  guest_count INTEGER NOT NULL,
  checkin_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  synced_at TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

-- Check-in log table
-- Stores all check-ins for local logging and reporting
-- Includes denormalized customer data for efficient queries
CREATE TABLE IF NOT EXISTS checkin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  guest_count INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  checkin_type TEXT NOT NULL DEFAULT 'member',
  synced_to_square INTEGER NOT NULL DEFAULT 0,
  -- Denormalized customer data for reports
  customer_name TEXT,
  email_address TEXT,
  phone_number TEXT,
  lot_number TEXT,
  membership_types TEXT,      -- Comma-separated display names
  location_id TEXT            -- Computer/device name
);

-- Application configuration table
-- Stores runtime configuration (cache status, etc.)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_segments_sort ON customer_segments(sort_order);
CREATE INDEX IF NOT EXISTS idx_customer_segments_enabled ON customer_segments(enabled);
CREATE INDEX IF NOT EXISTS idx_customer_groups_sort ON customer_groups(sort_order);
CREATE INDEX IF NOT EXISTS idx_customer_groups_enabled ON customer_groups(enabled);
CREATE INDEX IF NOT EXISTS idx_membership_cache_last_verified ON membership_cache(last_verified_at);
CREATE INDEX IF NOT EXISTS idx_checkin_queue_status ON checkin_queue(status);
CREATE INDEX IF NOT EXISTS idx_checkin_queue_created_at ON checkin_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_checkin_log_timestamp ON checkin_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkin_log_customer_id ON checkin_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_checkin_log_order_id ON checkin_log(order_id);
CREATE INDEX IF NOT EXISTS idx_checkin_log_checkin_type ON checkin_log(checkin_type);
CREATE INDEX IF NOT EXISTS idx_checkin_log_location_id ON checkin_log(location_id);
