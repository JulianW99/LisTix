export const createPlatformAdministrationTablesSql = `
  CREATE TABLE IF NOT EXISTS user_point_transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sold_order_id INTEGER NOT NULL UNIQUE REFERENCES sold_orders(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason VARCHAR(80) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS system_admin_members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'viewer'
      CHECK (role IN ('administrator', 'moderator', 'support', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
    invitation_token_hash VARCHAR(64) UNIQUE,
    invitation_expires_at TIMESTAMPTZ,
    invited_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS marketplace_controls (
    marketplace VARCHAR(120) PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    disabled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS system_admin_notification_preferences (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(80) NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    discord_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    pushover_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, event_type)
  );

  CREATE TABLE IF NOT EXISTS marketplace_publication_snapshots (
    publication_id INTEGER PRIMARY KEY REFERENCES listing_marketplace_publications(id) ON DELETE CASCADE,
    marketplace VARCHAR(120) NOT NULL,
    previous_status VARCHAR(30) NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS listing_status_snapshots (
    ticket_id INTEGER PRIMARY KEY REFERENCES tickets(id) ON DELETE CASCADE,
    previous_marketplace_status_id INTEGER NOT NULL REFERENCES marketplace_statuses(id) ON DELETE RESTRICT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS user_point_transactions_user_idx
    ON user_point_transactions(user_id, occurred_at DESC);
  CREATE INDEX IF NOT EXISTS system_admin_members_status_idx
    ON system_admin_members(status, role);
  CREATE INDEX IF NOT EXISTS marketplace_publication_snapshots_marketplace_idx
    ON marketplace_publication_snapshots(marketplace);
  CREATE INDEX IF NOT EXISTS system_admin_notification_preferences_event_idx
    ON system_admin_notification_preferences(event_type);

  UPDATE system_admin_members
  SET permissions = permissions || '["system.notifications.view", "system.notifications.manage"]'::jsonb,
      updated_at = NOW()
  WHERE role = 'administrator'
    AND NOT permissions @> '["system.notifications.view", "system.notifications.manage"]'::jsonb;
`;
