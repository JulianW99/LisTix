export const createAccountsTablesSql = `
  CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    multi_user_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS account_members (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'viewer'
      CHECK (role IN ('owner', 'administrator', 'manager', 'moderator', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
    invitation_token_hash VARCHAR(64) UNIQUE,
    invitation_expires_at TIMESTAMPTZ,
    invited_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, email),
    UNIQUE (account_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS account_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS account_members_user_id_idx ON account_members(user_id);
  CREATE INDEX IF NOT EXISTS account_members_account_id_idx ON account_members(account_id);
  CREATE INDEX IF NOT EXISTS account_activity_logs_account_created_idx
    ON account_activity_logs(account_id, created_at DESC);
`;
