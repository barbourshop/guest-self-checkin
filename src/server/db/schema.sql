-- Customer segments we care about (Square segment ID + user-friendly name)
CREATE TABLE IF NOT EXISTS customer_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  segment_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Membership cache table
-- Stores cached membership and customer details (names, address, etc.) from Square
CREATE TABLE IF NOT EXISTS membership_cache (
  customer_id TEXT PRIMARY KEY,
  has_membership INTEGER NOT NULL,
  segment_ids TEXT,
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
-- Stores check-ins that need to be synced when Square API is available
CREATE TABLE IF NOT EXISTS checkin_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  synced_at TEXT
);

-- Check-in log table
-- Stores all check-ins for local logging
-- checkin_type: 'member' = from search/scan; 'daypass' = anonymous day-pass sale
CREATE TABLE IF NOT EXISTS checkin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  guest_count INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  synced_to_square INTEGER NOT NULL DEFAULT 0,
  checkin_type TEXT NOT NULL DEFAULT 'member'
);

-- Application configuration table
-- Stores editable configuration settings (overrides environment variables)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_segments_sort ON customer_segments(sort_order);
CREATE INDEX IF NOT EXISTS idx_membership_cache_last_verified ON membership_cache(last_verified_at);
CREATE INDEX IF NOT EXISTS idx_checkin_queue_status ON checkin_queue(status);
CREATE INDEX IF NOT EXISTS idx_checkin_queue_created_at ON checkin_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_checkin_log_timestamp ON checkin_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkin_log_customer_id ON checkin_log(customer_id);
CREATE INDEX IF NOT EXISTS idx_checkin_log_order_id ON checkin_log(order_id);
CREATE INDEX IF NOT EXISTS idx_checkin_log_checkin_type ON checkin_log(checkin_type);

