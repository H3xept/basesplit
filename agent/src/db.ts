import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize SQLite database
const db: Database.Database = new Database(join(__dirname, '../database.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
export function initDatabase() {
  // Bills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      payer_address TEXT NOT NULL,
      image_url TEXT,
      total_amount REAL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      is_settled INTEGER DEFAULT 0
    )
  `);

  // Line items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS line_items (
      id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      claimed_by TEXT,
      paid_tx_hash TEXT,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    )
  `);

  // Users table (optional)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
      ens_name TEXT,
      display_name TEXT
    )
  `);

  console.log('✅ Database initialized');
}

// Bill operations
export interface Bill {
  id: string;
  conversation_id: string;
  payer_address: string;
  image_url?: string;
  total_amount?: number;
  created_at?: number;
  is_settled?: boolean;
}

export interface LineItem {
  id: string;
  bill_id: string;
  description: string;
  price: number;
  claimed_by?: string;
  paid_tx_hash?: string;
}

export function createBill(bill: Bill): void {
  const stmt = db.prepare(`
    INSERT INTO bills (id, conversation_id, payer_address, image_url, total_amount, is_settled)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    bill.id,
    bill.conversation_id,
    bill.payer_address,
    bill.image_url || null,
    bill.total_amount || null,
    bill.is_settled ? 1 : 0
  );
}

export function createLineItem(item: LineItem): void {
  const stmt = db.prepare(`
    INSERT INTO line_items (id, bill_id, description, price, claimed_by, paid_tx_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    item.id,
    item.bill_id,
    item.description,
    item.price,
    item.claimed_by || null,
    item.paid_tx_hash || null
  );
}

export function getBill(billId: string): Bill | undefined {
  const stmt = db.prepare('SELECT * FROM bills WHERE id = ?');
  const result = stmt.get(billId) as any;

  if (!result) return undefined;

  return {
    ...result,
    is_settled: Boolean(result.is_settled)
  };
}

export function getLineItems(billId: string): LineItem[] {
  const stmt = db.prepare('SELECT * FROM line_items WHERE bill_id = ?');
  return stmt.all(billId) as LineItem[];
}

export function updateLineItemClaim(
  itemId: string,
  claimedBy: string,
  txHash: string
): void {
  const stmt = db.prepare(`
    UPDATE line_items
    SET claimed_by = ?, paid_tx_hash = ?
    WHERE id = ?
  `);

  stmt.run(claimedBy, txHash, itemId);
}

export function markBillAsSettled(billId: string): void {
  const stmt = db.prepare('UPDATE bills SET is_settled = 1 WHERE id = ?');
  stmt.run(billId);
}

export { db };
