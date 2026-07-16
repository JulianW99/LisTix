export const createB2BMarketplaceTablesSql = `
  CREATE TABLE IF NOT EXISTS b2b_purchase_inquiries (
    id BIGSERIAL PRIMARY KEY,
    request_code VARCHAR(50) UNIQUE NOT NULL,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
    requester_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_email VARCHAR(255) NOT NULL,
    discord_user_id VARCHAR(40) NOT NULL,
    requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'open'
      CHECK (status IN ('open', 'closed', 'converted', 'canceled')),
    discord_channel_id VARCHAR(40),
    buyer_account_requested BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_checkout_session_id VARCHAR(255),
    stripe_payment_status VARCHAR(30) NOT NULL DEFAULT 'not_started',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS b2b_inquiries_ticket_idx
    ON b2b_purchase_inquiries(ticket_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS b2b_inquiries_requester_idx
    ON b2b_purchase_inquiries(requester_user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS b2b_inquiries_status_idx
    ON b2b_purchase_inquiries(status, created_at DESC);
`;
