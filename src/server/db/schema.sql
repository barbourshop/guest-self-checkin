-- Membership cache table
-- Stores cached membership status to avoid expensive Square API calls
CREATE TABLE IF NOT EXISTS membership_cache (
  customer_id TEXT PRIMARY KEY,
  has_membership INTEGER NOT NULL,
  membership_catalog_item_id TEXT,
  membership_variant_id TEXT,
  last_verified_at TEXT NOT NULL
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
CREATE TABLE IF NOT EXISTS checkin_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  guest_count INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  synced_to_square INTEGER NOT NULL DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_membership_cache_last_verified ON membership_cache(last_verified_at);
CREATE INDEX IF NOT EXISTS idx_checkin_queue_status ON checkin_queue(status);
CREATE INDEX IF NOT EXISTS idx_checkin_queue_created_at ON checkin_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_checkin_log_timestamp ON checkin_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkin_log_customer_id ON checkin_log(customer_id);

