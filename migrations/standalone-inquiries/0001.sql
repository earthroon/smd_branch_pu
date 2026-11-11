-- Standalone, isolated from smd-core CMS tables and Publication.
CREATE TABLE IF NOT EXISTS standalone_inquiries (
  id TEXT PRIMARY KEY NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  ip_digest TEXT NOT NULL,
  body_digest TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  preferred_schedule TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  privacy_revision TEXT NOT NULL,
  submitted_ms INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);
CREATE INDEX IF NOT EXISTS standalone_inquiries_by_time ON standalone_inquiries(submitted_ms DESC);
CREATE INDEX IF NOT EXISTS standalone_inquiries_by_ip_time ON standalone_inquiries(ip_digest, submitted_ms DESC);
CREATE TABLE IF NOT EXISTS standalone_inquiry_rate_window (
  subject_key TEXT NOT NULL,
  window_key INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (subject_key, window_key)
);
