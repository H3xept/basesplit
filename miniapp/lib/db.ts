import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

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
export async function getBill(billId: string): Promise<Bill | undefined> {
  const { rows } = await pool.query(
    'SELECT * FROM bills WHERE id = $1',
    [billId]
  );

  if (rows.length === 0) return undefined;

  const result = rows[0];
  return {
    id: result.id,
    conversation_id: result.conversation_id,
    payer_address: result.payer_address,
    image_url: result.image_url,
    total_amount: result.total_amount ? parseFloat(result.total_amount) : undefined,
    created_at: result.created_at ? parseInt(result.created_at) : undefined,
    is_settled: result.is_settled,
  };
}

/**
 * Get line items for a bill
 */
export async function getLineItems(billId: string): Promise<LineItem[]> {
  const { rows } = await pool.query(
    'SELECT * FROM line_items WHERE bill_id = $1',
    [billId]
  );

  return rows.map(row => ({
    id: row.id,
    bill_id: row.bill_id,
    description: row.description,
    price: parseFloat(row.price),
    claimed_by: row.claimed_by,
    paid_tx_hash: row.paid_tx_hash,
  }));
}

/**
 * Get bill with line items
 */
export async function getBillWithItems(billId: string) {
  const bill = await getBill(billId);
  if (!bill) return null;

  const items = await getLineItems(billId);

  return {
    bill,
    items,
  };
}

/**
 * Update line item claim status
 */
export async function updateLineItemClaim(
  itemId: string,
  claimedBy: string,
  txHash: string
): Promise<void> {
  await pool.query(
    'UPDATE line_items SET claimed_by = $1, paid_tx_hash = $2 WHERE id = $3',
    [claimedBy, txHash, itemId]
  );
}
