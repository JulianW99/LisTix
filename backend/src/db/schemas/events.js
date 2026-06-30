export const createEventsTableSql = `
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL REFERENCES event_categories(id) ON DELETE RESTRICT,
    event_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_name, venue_id, event_date)
  );
`;
