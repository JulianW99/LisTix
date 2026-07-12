export const createTicketsTableSql = `
  CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(40) UNIQUE NOT NULL,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    section_id INTEGER NOT NULL REFERENCES seat_sections(id) ON DELETE RESTRICT,
    marketplace_status_id INTEGER NOT NULL REFERENCES marketplace_statuses(id) ON DELETE RESTRICT,
    restriction_id INTEGER REFERENCES ticket_restrictions(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    row_label VARCHAR(80) NOT NULL DEFAULT '',
    lowest_seat INTEGER CHECK (lowest_seat IS NULL OR lowest_seat > 0),
    purchase_price NUMERIC(10, 2) NOT NULL CHECK (purchase_price >= 0),
    asking_price NUMERIC(10, 2) NOT NULL CHECK (asking_price >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS restriction_id INTEGER REFERENCES ticket_restrictions(id) ON DELETE RESTRICT;

  ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS row_label VARCHAR(80) NOT NULL DEFAULT '';

  ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS lowest_seat INTEGER CHECK (lowest_seat IS NULL OR lowest_seat > 0);

  ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

  CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON tickets(user_id);
`;
