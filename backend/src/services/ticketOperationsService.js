import { pool } from "../db/pool.js";
import { validateCreateTicketInput } from "../schemas/createTicketInputSchema.js";

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toNumber = (value) => (value === null || value === undefined ? null : Number(value));

const ticketSelectSql = `
  SELECT
    t.id,
    t.user_id,
    t.ticket_code,
    t.event_id,
    e.event_name,
    e.event_date,
    e.venue_id,
    v.name AS venue_name,
    v.city AS venue_city,
    e.category_id,
    ec.name AS category_name,
    t.section_id,
    ss.name AS section_name,
    COALESCE(NULLIF(t.row_label, ''), ss.row_label) AS row_label,
    t.lowest_seat,
    CASE
      WHEN t.lowest_seat IS NULL THEN ss.seat_label
      WHEN t.quantity = 1 THEN t.lowest_seat::text
      ELSE t.lowest_seat::text || '-' || (t.lowest_seat + t.quantity - 1)::text
    END AS seat_label,
    t.restriction_id,
    tr.name AS restriction_name,
    t.marketplace_status_id,
    ms.name AS marketplace_status_name,
    t.quantity,
    t.purchase_price,
    t.asking_price,
    t.notes,
    t.created_at,
    t.updated_at
  FROM tickets t
  INNER JOIN events e ON e.id = t.event_id
  INNER JOIN venues v ON v.id = e.venue_id
  INNER JOIN event_categories ec ON ec.id = e.category_id
  INNER JOIN seat_sections ss ON ss.id = t.section_id
  INNER JOIN marketplace_statuses ms ON ms.id = t.marketplace_status_id
  LEFT JOIN ticket_restrictions tr ON tr.id = t.restriction_id
`;

const mapTicketRow = (row) => ({
  databaseId: Number(row.id),
  userId: row.user_id === null ? null : Number(row.user_id),
  id: row.ticket_code,
  ticketCode: row.ticket_code,
  eventId: Number(row.event_id),
  eventName: row.event_name,
  venueId: Number(row.venue_id),
  venue: row.venue_name,
  venueCity: row.venue_city,
  categoryId: Number(row.category_id),
  categoryName: row.category_name,
  eventDate: row.event_date,
  sectionId: Number(row.section_id),
  section: row.section_name,
  rowLabel: row.row_label,
  lowestSeat: row.lowest_seat === null ? null : Number(row.lowest_seat),
  seatLabel: row.seat_label,
  restrictionId: row.restriction_id === null ? null : Number(row.restriction_id),
  restriction: row.restriction_name,
  marketplaceStatusId: Number(row.marketplace_status_id),
  marketplaceStatus: row.marketplace_status_name,
  quantity: Number(row.quantity),
  purchasePrice: toNumber(row.purchase_price),
  askingPrice: toNumber(row.asking_price),
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const soldOrderSelectSql = `
  SELECT
    so.id,
    so.order_code,
    so.ticket_id,
    t.ticket_code,
    t.quantity,
    t.purchase_price,
    t.asking_price,
    t.row_label,
    t.lowest_seat,
    t.section_id,
    ss.name AS section_name,
    CASE
      WHEN t.lowest_seat IS NULL THEN ss.seat_label
      WHEN t.quantity = 1 THEN t.lowest_seat::text
      ELSE t.lowest_seat::text || '-' || (t.lowest_seat + t.quantity - 1)::text
    END AS seat_label,
    e.event_name,
    e.event_date,
    v.name AS venue_name,
    v.city AS venue_city,
    so.buyer_channel_id,
    bc.name AS buyer_channel_name,
    so.dispatch_status_id,
    ds.name AS dispatch_status_name,
    ds.is_terminal,
    so.sold_at,
    so.payout_amount,
    so.customer_name,
    so.created_at,
    so.updated_at
  FROM sold_orders so
  INNER JOIN tickets t ON t.id = so.ticket_id
  INNER JOIN events e ON e.id = t.event_id
  INNER JOIN venues v ON v.id = e.venue_id
  INNER JOIN seat_sections ss ON ss.id = t.section_id
  INNER JOIN buyer_channels bc ON bc.id = so.buyer_channel_id
  INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
`;

export const mapSoldOrderRow = (row) => ({
  databaseId: Number(row.id),
  id: row.order_code,
  orderCode: row.order_code,
  ticketDatabaseId: Number(row.ticket_id),
  ticketId: row.ticket_code,
  ticketCode: row.ticket_code,
  eventName: row.event_name,
  eventDate: row.event_date,
  venueName: row.venue_name,
  venueCity: row.venue_city,
  sectionId: Number(row.section_id),
  section: row.section_name,
  rowLabel: row.row_label,
  lowestSeat: row.lowest_seat === null ? null : Number(row.lowest_seat),
  seatLabel: row.seat_label,
  quantity: Number(row.quantity),
  purchasePrice: toNumber(row.purchase_price),
  askingPrice: toNumber(row.asking_price),
  buyerChannelId: Number(row.buyer_channel_id),
  buyerChannel: row.buyer_channel_name,
  dispatchStatusId: Number(row.dispatch_status_id),
  dispatchStatus: row.dispatch_status_name,
  dispatchComplete: Boolean(row.is_terminal),
  soldAt: row.sold_at,
  payoutAt: row.sold_at,
  payoutAmount: toNumber(row.payout_amount),
  profit: toNumber(row.payout_amount) - toNumber(row.purchase_price) * Number(row.quantity),
  roi:
    toNumber(row.purchase_price) > 0
      ? ((toNumber(row.payout_amount) - toNumber(row.purchase_price) * Number(row.quantity)) /
          (toNumber(row.purchase_price) * Number(row.quantity))) *
        100
      : 0,
  customerName: row.customer_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listTickets = async (user) => {
  const result = await pool.query(`
    ${ticketSelectSql}
    WHERE t.user_id = $1
    ORDER BY e.event_date ASC, t.ticket_code ASC
  `, [user.sub]);

  return result.rows.map(mapTicketRow);
};

export const getTicketByIdentifier = async (identifier, user) => {
  const textIdentifier = String(identifier);
  const isNumericIdentifier = /^\d+$/.test(textIdentifier);
  const result = isNumericIdentifier
    ? await pool.query(
        `
          ${ticketSelectSql}
          WHERE (t.id = $1 OR t.ticket_code = $2) AND t.user_id = $3
          LIMIT 1
        `,
        [Number(textIdentifier), textIdentifier, user.sub],
      )
    : await pool.query(
        `
          ${ticketSelectSql}
          WHERE t.ticket_code = $1 AND t.user_id = $2
          LIMIT 1
        `,
        [textIdentifier, user.sub],
      );

  return result.rows[0] ? mapTicketRow(result.rows[0]) : null;
};

const getTicketDatabaseRow = async (client, identifier, user) => {
  const textIdentifier = String(identifier);
  const isNumericIdentifier = /^\d+$/.test(textIdentifier);
  const result = isNumericIdentifier
    ? await client.query(
        `
          SELECT id, event_id, section_id, marketplace_status_id, restriction_id
          FROM tickets
          WHERE (id = $1 OR ticket_code = $2) AND user_id = $3
          LIMIT 1
        `,
        [Number(textIdentifier), textIdentifier, user.sub],
      )
    : await client.query(
        `
          SELECT id, event_id, section_id, marketplace_status_id, restriction_id
          FROM tickets
          WHERE ticket_code = $1 AND user_id = $2
          LIMIT 1
        `,
        [textIdentifier, user.sub],
      );

  return result.rows[0] ?? null;
};

const generateTicketCode = async (client) => {
  const result = await client.query(`
    SELECT
      COALESCE(
        MAX(
          CASE
            WHEN ticket_code ~ '^TCK-[0-9]+$' THEN substring(ticket_code FROM 5)::int
            ELSE NULL
          END
        ),
        1000
      ) + 1 AS next_number
    FROM tickets
  `);

  return `TCK-${result.rows[0].next_number}`;
};

const getDraftMarketplaceStatusId = async (client) => {
  const result = await client.query(
    "SELECT id FROM marketplace_statuses WHERE name = 'Draft' LIMIT 1",
  );

  if (!result.rows[0]) {
    const error = new Error("Draft marketplace status is missing.");
    error.statusCode = 500;
    throw error;
  }

  return Number(result.rows[0].id);
};

const assertTicketRefs = async (
  client,
  eventId,
  sectionId,
  marketplaceStatusId,
  restrictionId,
) => {
  const result = await client.query(
    `
      SELECT
        e.id AS event_id,
        e.venue_id AS event_venue_id,
        ss.id AS section_id,
        ss.venue_id AS section_venue_id,
        ms.id AS marketplace_status_id,
        tr.id AS restriction_id
      FROM events e
      LEFT JOIN seat_sections ss ON ss.id = $2
      LEFT JOIN marketplace_statuses ms ON ms.id = $3
      LEFT JOIN ticket_restrictions tr ON tr.id = $4
      WHERE e.id = $1
      LIMIT 1
    `,
    [eventId, sectionId, marketplaceStatusId, restrictionId],
  );

  const refs = result.rows[0];

  if (!refs || !refs.event_id) {
    const error = new Error("Selected event does not exist.");
    error.statusCode = 400;
    throw error;
  }

  if (!refs.section_id) {
    const error = new Error("Selected section does not exist.");
    error.statusCode = 400;
    throw error;
  }

  if (!refs.marketplace_status_id) {
    const error = new Error("Selected marketplace status does not exist.");
    error.statusCode = 400;
    throw error;
  }

  if (!refs.restriction_id) {
    const error = new Error("Selected restriction does not exist.");
    error.statusCode = 400;
    throw error;
  }

  if (Number(refs.event_venue_id) !== Number(refs.section_venue_id)) {
    const error = new Error("Selected section does not belong to the selected event venue.");
    error.statusCode = 400;
    throw error;
  }
};

export const createTicket = async (payload, user) => {
  const validation = validateCreateTicketInput(payload);

  if (!validation.ok) {
    const error = new Error("Ticket input is invalid.");
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const marketplaceStatusId =
      validation.value.marketplaceStatusId ?? await getDraftMarketplaceStatusId(client);

    await assertTicketRefs(
      client,
      validation.value.eventId,
      validation.value.sectionId,
      marketplaceStatusId,
      validation.value.restrictionId,
    );

    const ticketCode = await generateTicketCode(client);
    const result = await client.query(
      `
        INSERT INTO tickets (
          ticket_code,
          event_id,
          section_id,
          marketplace_status_id,
          restriction_id,
          quantity,
          row_label,
          lowest_seat,
          purchase_price,
          asking_price,
          notes
          , user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `,
      [
        ticketCode,
        validation.value.eventId,
        validation.value.sectionId,
        marketplaceStatusId,
        validation.value.restrictionId,
        validation.value.quantity,
        validation.value.rowLabel,
        validation.value.lowestSeat,
        validation.value.purchasePrice,
        validation.value.askingPrice,
        validation.value.notes ?? null,
        user.sub,
      ],
    );

    await client.query("COMMIT");

    return getTicketByIdentifier(result.rows[0].id, user);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateTicket = async (identifier, payload, user) => {
  const validation = validateCreateTicketInput(payload, { partial: true });

  if (!validation.ok) {
    const error = new Error("Ticket input is invalid.");
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const fields = [
    ["eventId", "event_id"],
    ["sectionId", "section_id"],
    ["restrictionId", "restriction_id"],
    ["marketplaceStatusId", "marketplace_status_id"],
    ["quantity", "quantity"],
    ["rowLabel", "row_label"],
    ["lowestSeat", "lowest_seat"],
    ["purchasePrice", "purchase_price"],
    ["askingPrice", "asking_price"],
    ["notes", "notes"],
  ].filter(([fieldName]) => Object.hasOwn(validation.value, fieldName));

  if (fields.length === 0) {
    const error = new Error("No ticket fields provided.");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingTicket = await getTicketDatabaseRow(client, identifier, user);

    if (!existingTicket) {
      const error = new Error("Ticket not found.");
      error.statusCode = 404;
      throw error;
    }

    const nextEventId = validation.value.eventId ?? Number(existingTicket.event_id);
    const nextSectionId = validation.value.sectionId ?? Number(existingTicket.section_id);
    const nextMarketplaceStatusId =
      validation.value.marketplaceStatusId ?? Number(existingTicket.marketplace_status_id);
    const nextRestrictionId =
      validation.value.restrictionId ?? Number(existingTicket.restriction_id);

    if (
      validation.value.eventId !== undefined ||
      validation.value.sectionId !== undefined ||
      validation.value.marketplaceStatusId !== undefined ||
      validation.value.restrictionId !== undefined
    ) {
      await assertTicketRefs(
        client,
        nextEventId,
        nextSectionId,
        nextMarketplaceStatusId,
        nextRestrictionId,
      );
    }

    const setFragments = fields.map(([_fieldName, column], index) => (
      `${column} = $${index + 1}`
    ));
    const values = fields.map(([fieldName]) => validation.value[fieldName]);

    const result = await client.query(
      `
        UPDATE tickets
        SET ${setFragments.join(", ")}, updated_at = NOW()
        WHERE id = $${values.length + 1}
        RETURNING id
      `,
      [...values, existingTicket.id],
    );

    await client.query("COMMIT");

    return getTicketByIdentifier(result.rows[0].id, user);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deleteTicket = async (identifier, user) => {
  const client = await pool.connect();

  try {
    const existingTicket = await getTicketDatabaseRow(client, identifier, user);

    if (!existingTicket) {
      return false;
    }

    await client.query("DELETE FROM tickets WHERE id = $1", [existingTicket.id]);
    return true;
  } finally {
    client.release();
  }
};

export const listSoldOrders = async (user) => {
  const result = await pool.query(`
    ${soldOrderSelectSql}
    WHERE t.user_id = $1
    ORDER BY so.sold_at DESC, so.order_code ASC
  `, [user.sub]);

  return result.rows.map(mapSoldOrderRow);
};

export const getTicketInputOptions = async () => {
  const [
    eventsResult,
    sectionsResult,
    statusesResult,
    restrictionsResult,
    dispatchStatusesResult,
  ] = await Promise.all([
    pool.query(`
      SELECT
        e.id,
        e.event_name,
        e.event_date,
        e.venue_id,
        v.name AS venue_name,
        v.city AS venue_city
      FROM events e
      INNER JOIN venues v ON v.id = e.venue_id
      ORDER BY e.event_date ASC, e.event_name ASC
    `),
    pool.query(`
      SELECT
        MIN(ss.id)::int AS id,
        ss.venue_id,
        v.name AS venue_name,
        ss.name
      FROM seat_sections ss
      INNER JOIN venues v ON v.id = ss.venue_id
      GROUP BY ss.venue_id, v.name, ss.name
      ORDER BY v.name ASC, ss.name ASC
    `),
    pool.query(`
      SELECT id, name
      FROM marketplace_statuses
      ORDER BY
        CASE name
          WHEN 'Draft' THEN 1
          WHEN 'Needs pricing' THEN 2
          WHEN 'Listed' THEN 3
          WHEN 'Sold' THEN 4
          ELSE 5
        END,
        name ASC
    `),
    pool.query(`
      SELECT id, name
      FROM ticket_restrictions
      ORDER BY
        CASE name
          WHEN 'No restrictions' THEN 1
          ELSE 2
        END,
        name ASC
    `),
    pool.query(`
      SELECT id, name, is_terminal
      FROM dispatch_statuses
      ORDER BY
        CASE name
          WHEN 'Awaiting transfer' THEN 1
          WHEN 'Ready to send' THEN 2
          WHEN 'Completed' THEN 3
          ELSE 4
        END,
        name ASC
    `),
  ]);

  return {
    events: eventsResult.rows.map((row) => ({
      id: Number(row.id),
      eventName: row.event_name,
      eventDate: row.event_date,
      venueId: Number(row.venue_id),
      venueName: row.venue_name,
      venueCity: row.venue_city,
    })),
    sections: sectionsResult.rows.map((row) => ({
      id: Number(row.id),
      venueId: Number(row.venue_id),
      venueName: row.venue_name,
      name: row.name,
    })),
    marketplaceStatuses: statusesResult.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
    })),
    restrictions: restrictionsResult.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
    })),
    dispatchStatuses: dispatchStatusesResult.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      isTerminal: Boolean(row.is_terminal),
    })),
  };
};

export const getDashboardSnapshot = async (user) => {
  const [summaryResult, trendResult, platformResult] = await Promise.all([
    pool.query(`
      WITH sold_ticket_costs AS (
        SELECT
          so.id,
          so.payout_amount,
          t.purchase_price * t.quantity AS total_purchase_price,
          ds.is_terminal
        FROM sold_orders so
        INNER JOIN tickets t ON t.id = so.ticket_id
        INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
        WHERE t.user_id = $1
      )
      SELECT
        (SELECT COUNT(*)::int FROM tickets WHERE user_id = $1 AND marketplace_status_id = (SELECT id FROM marketplace_statuses WHERE name = 'Listed')) AS listed_tickets,
        (SELECT COUNT(*)::int FROM sold_ticket_costs) AS sold_tickets,
        COALESCE(SUM(payout_amount), 0)::float AS total_payout,
        COALESCE(SUM(CASE WHEN is_terminal = TRUE THEN payout_amount ELSE 0 END), 0)::float AS payout_received,
        COALESCE(SUM(total_purchase_price), 0)::float AS cost_of_sold_tickets,
        COALESCE((SELECT SUM(quantity) FROM tickets WHERE user_id = $1), 0)::int AS tickets_in_inventory
      FROM sold_ticket_costs
    `, [user.sub]),
    pool.query(`
      SELECT
          EXTRACT(MONTH FROM so.sold_at)::int AS sales_month,
          SUM(so.payout_amount)::float AS sales,
          SUM(t.purchase_price * t.quantity)::float AS cost,
          SUM(so.payout_amount - (t.purchase_price * t.quantity))::float AS profit
      FROM sold_orders so
      INNER JOIN tickets t ON t.id = so.ticket_id
      WHERE EXTRACT(YEAR FROM so.sold_at)::int = EXTRACT(YEAR FROM NOW())::int
        AND t.user_id = $1
      GROUP BY sales_month
      ORDER BY sales_month ASC
    `, [user.sub]),
    pool.query(`
      SELECT
        bc.name,
        COUNT(so.id)::int AS count
      FROM sold_orders so
      INNER JOIN buyer_channels bc ON bc.id = so.buyer_channel_id
      INNER JOIN tickets t ON t.id = so.ticket_id
      WHERE t.user_id = $1
      GROUP BY bc.name
      ORDER BY count DESC
    `, [user.sub]),
  ]);

  const summary = summaryResult.rows[0] || {};
  const totalPayout = toNumber(summary.total_payout) || 0;
  const costOfSoldTickets = toNumber(summary.cost_of_sold_tickets) || 0;
  const profit = totalPayout - costOfSoldTickets;
  const averageRoi = costOfSoldTickets > 0 ? (profit / costOfSoldTickets) * 100 : 0;

  const salesByMonth = (trendResult.rows || []).reduce((acc, row) => {
    const sales = toNumber(row.sales) || 0;
    const cost = toNumber(row.cost) || 0;
    const profitByMonth = toNumber(row.profit) || 0;
    acc[Number(row.sales_month)] = {
      sales,
      cost,
      profit: profitByMonth,
      averageRoi: cost > 0 ? (profitByMonth / cost) * 100 : 0,
    };
    return acc;
  }, {});

  return {
    // New Stats
    listedTickets: toNumber(summary.listed_tickets) || 0,
    soldTickets: toNumber(summary.sold_tickets) || 0,
    profit: profit,
    payoutReceived: toNumber(summary.payout_received) || 0,
    pendingPayout: totalPayout - (toNumber(summary.payout_received) || 0),
    salesByPlatform: (platformResult.rows || []).map((row) => ({
      name: row.name,
      count: Number(row.count),
    })),
    averageRoi: averageRoi,

    // Original stats that might still be useful
    grossSales: totalPayout,
    ticketsInInventory: toNumber(summary.tickets_in_inventory) || 0,
    monthlyTrend: Array.from({ length: 12 }, (_entry, index) => ({
      label: monthLabels[index],
      sales: salesByMonth[index + 1]?.sales ?? 0,
      profit: salesByMonth[index + 1]?.profit ?? 0,
      averageRoi: salesByMonth[index + 1]?.averageRoi ?? 0,
    })),
  };
};
