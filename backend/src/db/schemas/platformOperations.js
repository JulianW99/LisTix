export const createPlatformOperationsTablesSql = `
  CREATE TABLE IF NOT EXISTS listing_marketplace_publications (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    marketplace VARCHAR(120) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    external_listing_id VARCHAR(160),
    error_message TEXT,
    listing_url TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticket_id, marketplace)
  );

  CREATE TABLE IF NOT EXISTS platform_actions (
    id BIGSERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    severity VARCHAR(20) NOT NULL DEFAULT 'normal',
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sold_order_id INTEGER REFERENCES sold_orders(id) ON DELETE SET NULL,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    source VARCHAR(50) NOT NULL DEFAULT 'system',
    source_reference VARCHAR(255),
    discord_channel_id VARCHAR(40),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS platform_actions_source_reference_idx
    ON platform_actions(source, source_reference)
    WHERE source_reference IS NOT NULL;
  CREATE INDEX IF NOT EXISTS platform_actions_status_idx ON platform_actions(status, detected_at DESC);
  CREATE INDEX IF NOT EXISTS listing_publications_ticket_idx ON listing_marketplace_publications(ticket_id);
`;
