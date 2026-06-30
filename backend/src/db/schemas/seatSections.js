export const createSeatSectionsTableSql = `
  CREATE TABLE IF NOT EXISTS seat_sections (
    id SERIAL PRIMARY KEY,
    venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
    name VARCHAR(160) NOT NULL,
    row_label VARCHAR(80) NOT NULL DEFAULT '',
    seat_label VARCHAR(80) NOT NULL DEFAULT '',
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (venue_id, name, row_label, seat_label)
  );
`;
