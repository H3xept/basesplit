import pg from 'pg';
const { Pool } = pg;

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

// Create tables (should be run once during setup, but safe with IF NOT EXISTS)
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // Bills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        payer_address TEXT NOT NULL,
        image_url TEXT,
        total_amount NUMERIC(20, 6),
        created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
        is_settled BOOLEAN DEFAULT FALSE
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bills_conversation_id ON bills(conversation_id)
    `);

    // Line items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS line_items (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        description TEXT NOT NULL,
        price NUMERIC(20, 6) NOT NULL,
        claimed_by TEXT,
        paid_tx_hash TEXT,
        CONSTRAINT fk_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_line_items_bill_id ON line_items(bill_id)
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        wallet_address TEXT PRIMARY KEY,
        ens_name TEXT,
        display_name TEXT
      )
    `);

    console.log('✅ Database tables initialized');
  } finally {
    client.release();
  }
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

export async function createBill(bill: Bill): Promise<void> {
  await pool.query(
    `INSERT INTO bills (id, conversation_id, payer_address, image_url, total_amount, is_settled)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      bill.id,
      bill.conversation_id,
      bill.payer_address,
      bill.image_url || null,
      bill.total_amount || null,
      bill.is_settled || false
    ]
  );
}

export async function createLineItem(item: LineItem): Promise<void> {
  await pool.query(
    `INSERT INTO line_items (id, bill_id, description, price, claimed_by, paid_tx_hash)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      item.id,
      item.bill_id,
      item.description,
      item.price,
      item.claimed_by || null,
      item.paid_tx_hash || null
    ]
  );
}

export async function getBill(billId: string): Promise<Bill | undefined> {
  const result = await pool.query(
    'SELECT * FROM bills WHERE id = $1',
    [billId]
  );

  if (result.rows.length === 0) return undefined;

  const row = result.rows[0];
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    payer_address: row.payer_address,
    image_url: row.image_url,
    total_amount: row.total_amount ? parseFloat(row.total_amount) : undefined,
    created_at: row.created_at ? parseInt(row.created_at) : undefined,
    is_settled: row.is_settled,
  };
}

export async function getLineItems(billId: string): Promise<LineItem[]> {
  const result = await pool.query(
    'SELECT * FROM line_items WHERE bill_id = $1',
    [billId]
  );

  return result.rows.map(row => ({
    id: row.id,
    bill_id: row.bill_id,
    description: row.description,
    price: parseFloat(row.price),
    claimed_by: row.claimed_by,
    paid_tx_hash: row.paid_tx_hash,
  }));
}

export async function updateLineItemClaim(
  itemId: string,
  claimedBy: string,
  txHash: string
): Promise<void> {
  await pool.query(
    `UPDATE line_items
     SET claimed_by = $1, paid_tx_hash = $2
     WHERE id = $3`,
    [claimedBy, txHash, itemId]
  );
}

export async function markBillAsSettled(billId: string): Promise<void> {
  await pool.query(
    'UPDATE bills SET is_settled = TRUE WHERE id = $1',
    [billId]
  );
}

// Export pool for any custom queries
export { pool };
