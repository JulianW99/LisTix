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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;
