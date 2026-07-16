export const createUserConnectionsTableSql = `
  CREATE TABLE IF NOT EXISTS user_connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(40) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255),
    avatar_hash VARCHAR(255),
    scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, provider),
    UNIQUE (provider, provider_user_id)
  );

  CREATE INDEX IF NOT EXISTS user_connections_user_id_idx
    ON user_connections(user_id);
`;
