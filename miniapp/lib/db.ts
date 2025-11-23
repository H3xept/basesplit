import Database from 'better-sqlite3';
import { join } from 'path';

// Connect to the same database as the agent
const dbPath = join(process.cwd(), '../agent/database.db');
const db = new Database(dbPath);

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

/**
 * Get bill by ID
 */
export function getBill(billId: string): Bill | undefined {
  const stmt = db.prepare('SELECT * FROM bills WHERE id = ?');
  const result = stmt.get(billId) as any;

  if (!result) return undefined;

  return {
    ...result,
    is_settled: Boolean(result.is_settled),
  };
}

/**
 * Get line items for a bill
 */
export function getLineItems(billId: string): LineItem[] {
  const stmt = db.prepare('SELECT * FROM line_items WHERE bill_id = ?');
  return stmt.all(billId) as LineItem[];
}

/**
 * Get bill with line items
 */
export function getBillWithItems(billId: string) {
  const bill = getBill(billId);
  if (!bill) return null;

  const items = getLineItems(billId);

  return {
    bill,
    items,
  };
}

/**
 * Update line item claim status
 */
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

export default db;
