-- Splitet Database Schema for PostgreSQL
-- Run this SQL against your Vercel Postgres database to create the schema

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  payer_address TEXT NOT NULL,
  image_url TEXT,
  total_amount NUMERIC(20, 6),
  created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  is_settled BOOLEAN DEFAULT FALSE
);

-- Create index on conversation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_bills_conversation_id ON bills(conversation_id);
CREATE INDEX IF NOT EXISTS idx_bills_payer_address ON bills(payer_address);
CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);

-- Line items table
CREATE TABLE IF NOT EXISTS line_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(20, 6) NOT NULL,
  claimed_by TEXT,
  paid_tx_hash TEXT,
  CONSTRAINT fk_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_line_items_bill_id ON line_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_line_items_claimed_by ON line_items(claimed_by);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  ens_name TEXT,
  display_name TEXT
);

-- Create index on display_name for search
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
