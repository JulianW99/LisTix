export const createSoldOrdersTableSql = `
  CREATE TABLE IF NOT EXISTS sold_orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(40) UNIQUE NOT NULL,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    buyer_channel_id INTEGER NOT NULL REFERENCES buyer_channels(id) ON DELETE RESTRICT,
    dispatch_status_id INTEGER NOT NULL REFERENCES dispatch_statuses(id) ON DELETE RESTRICT,
    sold_at TIMESTAMPTZ NOT NULL,
    payout_amount NUMERIC(10, 2) NOT NULL CHECK (payout_amount >= 0),
    customer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255),
    sent_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS buyer_email VARCHAR(255);
  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS sent_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS marketplace_sale_id VARCHAR(120);
  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS delivery_deadline TIMESTAMPTZ;
  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS scheduled_payout_at TIMESTAMPTZ;
  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
  ALTER TABLE sold_orders ADD COLUMN IF NOT EXISTS listix_fee_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (listix_fee_amount >= 0);

  UPDATE sold_orders
  SET marketplace_sale_id = 'MKT-' || id::text
  WHERE marketplace_sale_id IS NULL;

  UPDATE sold_orders
  SET delivery_deadline = LEAST(sold_at + INTERVAL '48 hours', (SELECT event_date FROM events e INNER JOIN tickets t ON t.event_id = e.id WHERE t.id = sold_orders.ticket_id) - INTERVAL '24 hours')
  WHERE delivery_deadline IS NULL;

  UPDATE sold_orders
  SET scheduled_payout_at = sold_at + INTERVAL '7 days'
  WHERE scheduled_payout_at IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS sold_orders_marketplace_sale_unique_idx
    ON sold_orders(buyer_channel_id, marketplace_sale_id)
    WHERE marketplace_sale_id IS NOT NULL;
`;
