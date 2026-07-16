import { mapAuditFields } from "./entityRepository.js";
import {
  createTicket,
  deleteTicket,
  getSoldOrderByIdentifier,
  getTicketByIdentifier,
  listSoldOrders,
  listTickets,
  updateSoldOrder,
  updateTicket,
} from "./ticketOperationsService.js";

const mapLookupRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  description: row.description,
  ...mapAuditFields(row),
});

const mapVenueRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  city: row.city,
  country: row.country,
  timezone: row.timezone,
  ...mapAuditFields(row),
});

const mapEventRow = (row) => ({
  id: Number(row.id),
  eventName: row.event_name,
  venueId: Number(row.venue_id),
  venueName: row.venue_name,
  venueCity: row.venue_city,
  categoryId: Number(row.category_id),
  categoryName: row.category_name,
  eventDate: row.event_date,
  ...mapAuditFields(row),
});

const mapSeatSectionRow = (row) => ({
  id: Number(row.id),
  venueId: Number(row.venue_id),
  venueName: row.venue_name,
  name: row.name,
  rowLabel: row.row_label,
  seatLabel: row.seat_label,
  capacity: row.capacity === null ? null : Number(row.capacity),
  ...mapAuditFields(row),
});

const mapDispatchStatusRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  description: row.description,
  isTerminal: Boolean(row.is_terminal),
  ...mapAuditFields(row),
});

const mapSoldOrderRow = (row) => ({
  databaseId: Number(row.id),
  id: row.order_code,
  orderCode: row.order_code,
  ticketDatabaseId: Number(row.ticket_id),
  ticketId: row.ticket_code,
  buyerChannelId: Number(row.buyer_channel_id),
  buyerChannel: row.buyer_channel_name,
  dispatchStatusId: Number(row.dispatch_status_id),
  dispatchStatus: row.dispatch_status_name,
  soldAt: row.sold_at,
  payoutAmount: Number(row.payout_amount),
  customerName: row.customer_name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapUserRow = (row) => ({
  id: Number(row.id),
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const entityDefinitions = [
  {
    key: "eventCategories",
    routePath: "event-categories",
    label: "event category",
    table: "event_categories",
    fields: [
      { name: "name", column: "name", type: "string", required: true },
      { name: "description", column: "description", type: "string" },
    ],
    listSql: `
      SELECT id, name, description, created_at, updated_at
      FROM event_categories
      ORDER BY name ASC
    `,
    getSql: `
      SELECT id, name, description, created_at, updated_at
      FROM event_categories
      WHERE id = $1
      LIMIT 1
    `,
    mapRow: mapLookupRow,
  },
  {
    key: "venues",
    routePath: "venues",
    label: "venue",
    table: "venues",
    fields: [
      { name: "name", column: "name", type: "string", required: true },
      { name: "city", column: "city", type: "string", required: true },
      { name: "country", column: "country", type: "string", required: true },
      { name: "timezone", column: "timezone", type: "string", required: true },
    ],
    listSql: `
      SELECT id, name, city, country, timezone, created_at, updated_at
      FROM venues
      ORDER BY city ASC, name ASC
    `,
    getSql: `
      SELECT id, name, city, country, timezone, created_at, updated_at
      FROM venues
      WHERE id = $1
      LIMIT 1
    `,
    mapRow: mapVenueRow,
  },
  {
    key: "events",
    routePath: "events",
    label: "event",
    table: "events",
    fields: [
      { name: "eventName", column: "event_name", type: "string", required: true },
      { name: "venueId", column: "venue_id", type: "integer", required: true },
      { name: "categoryId", column: "category_id", type: "integer", required: true },
      { name: "eventDate", column: "event_date", type: "datetime", required: true },
    ],
    listSql: `
      SELECT
        e.id,
        e.event_name,
        e.venue_id,
        v.name AS venue_name,
        v.city AS venue_city,
        e.category_id,
        ec.name AS category_name,
        e.event_date,
        e.created_at,
        e.updated_at
      FROM events e
      INNER JOIN venues v ON v.id = e.venue_id
      INNER JOIN event_categories ec ON ec.id = e.category_id
      ORDER BY e.event_date ASC, e.event_name ASC
    `,
    getSql: `
      SELECT
        e.id,
        e.event_name,
        e.venue_id,
        v.name AS venue_name,
        v.city AS venue_city,
        e.category_id,
        ec.name AS category_name,
        e.event_date,
        e.created_at,
        e.updated_at
      FROM events e
      INNER JOIN venues v ON v.id = e.venue_id
      INNER JOIN event_categories ec ON ec.id = e.category_id
      WHERE e.id = $1
      LIMIT 1
    `,
    mapRow: mapEventRow,
  },
  {
    key: "seatSections",
    routePath: "seat-sections",
    label: "seat section",
    table: "seat_sections",
    fields: [
      { name: "venueId", column: "venue_id", type: "integer", required: true },
      { name: "name", column: "name", type: "string", required: true },
      { name: "rowLabel", column: "row_label", type: "string" },
      { name: "seatLabel", column: "seat_label", type: "string" },
      { name: "capacity", column: "capacity", type: "integer", min: 1 },
    ],
    listSql: `
      SELECT
        ss.id,
        ss.venue_id,
        v.name AS venue_name,
        ss.name,
        ss.row_label,
        ss.seat_label,
        ss.capacity,
        ss.created_at,
        ss.updated_at
      FROM seat_sections ss
      INNER JOIN venues v ON v.id = ss.venue_id
      ORDER BY v.name ASC, ss.name ASC
    `,
    getSql: `
      SELECT
        ss.id,
        ss.venue_id,
        v.name AS venue_name,
        ss.name,
        ss.row_label,
        ss.seat_label,
        ss.capacity,
        ss.created_at,
        ss.updated_at
      FROM seat_sections ss
      INNER JOIN venues v ON v.id = ss.venue_id
      WHERE ss.id = $1
      LIMIT 1
    `,
    mapRow: mapSeatSectionRow,
  },
  {
    key: "marketplaceStatuses",
    routePath: "marketplace-statuses",
    label: "marketplace status",
    table: "marketplace_statuses",
    fields: [
      { name: "name", column: "name", type: "string", required: true },
      { name: "description", column: "description", type: "string" },
    ],
    listSql: `
      SELECT id, name, description, created_at, updated_at
      FROM marketplace_statuses
      ORDER BY name ASC
    `,
    getSql: `
      SELECT id, name, description, created_at, updated_at
      FROM marketplace_statuses
      WHERE id = $1
      LIMIT 1
    `,
    mapRow: mapLookupRow,
  },
  {
    key: "buyerChannels",
    routePath: "buyer-channels",
    label: "buyer channel",
    table: "buyer_channels",
    fields: [
      { name: "name", column: "name", type: "string", required: true },
      { name: "description", column: "description", type: "string" },
    ],
    listSql: `
      SELECT id, name, description, created_at, updated_at
      FROM buyer_channels
      ORDER BY name ASC
    `,
    getSql: `
      SELECT id, name, description, created_at, updated_at
      FROM buyer_channels
      WHERE id = $1
      LIMIT 1
    `,
    mapRow: mapLookupRow,
  },
  {
    key: "dispatchStatuses",
    routePath: "dispatch-statuses",
    label: "dispatch status",
    table: "dispatch_statuses",
    fields: [
      { name: "name", column: "name", type: "string", required: true },
      { name: "description", column: "description", type: "string" },
      { name: "isTerminal", column: "is_terminal", type: "boolean" },
    ],
    listSql: `
      SELECT id, name, description, is_terminal, created_at, updated_at
      FROM dispatch_statuses
      ORDER BY is_terminal ASC, name ASC
    `,
    getSql: `
      SELECT id, name, description, is_terminal, created_at, updated_at
      FROM dispatch_statuses
      WHERE id = $1
      LIMIT 1
    `,
    mapRow: mapDispatchStatusRow,
  },
  {
    key: "ticketRestrictions",
    routePath: "ticket-restrictions",
    label: "ticket restriction",
    table: "ticket_restrictions",
    fields: [
      { name: "name", column: "name", type: "string", required: true },
      { name: "description", column: "description", type: "string" },
    ],
    listSql: `
      SELECT id, name, description, created_at, updated_at
      FROM ticket_restrictions
      ORDER BY
        CASE name
          WHEN 'No restrictions' THEN 1
          ELSE 2
        END,
        name ASC
    `,
    getSql: `
      SELECT id, name, description, created_at, updated_at
      FROM ticket_restrictions
      WHERE id = $1
      LIMIT 1
    `,
    mapRow: mapLookupRow,
  },
  {
    key: "tickets",
    routePath: "tickets",
    label: "ticket",
    table: "tickets",
    permissions: {
      list: "listings.view",
      get: "listings.view",
      create: "listings.create",
      update: "listings.edit",
      delete: "listings.delete",
    },
    fields: [],
    list: listTickets,
    get: getTicketByIdentifier,
    create: createTicket,
    update: updateTicket,
    delete: deleteTicket,
  },
  {
    key: "soldOrders",
    routePath: "sold-orders",
    label: "sold order",
    table: "sold_orders",
    allowCreate: false,
    allowDelete: false,
    permissions: {
      list: ["sales.view", "payments.view"],
      get: ["sales.view", "payments.view"],
      update: "sales.fulfill",
    },
    fields: [
      { name: "orderCode", column: "order_code", type: "string", required: true },
      { name: "ticketDatabaseId", column: "ticket_id", type: "integer", required: true },
      { name: "buyerChannelId", column: "buyer_channel_id", type: "integer", required: true },
      { name: "dispatchStatusId", column: "dispatch_status_id", type: "integer", required: true },
      { name: "soldAt", column: "sold_at", type: "datetime", required: true },
      { name: "payoutAmount", column: "payout_amount", type: "number", required: true, min: 0 },
      { name: "customerName", column: "customer_name", type: "string", required: true },
      { name: "buyerEmail", column: "buyer_email", type: "string" },
    ],
    list: listSoldOrders,
    get: getSoldOrderByIdentifier,
    update: updateSoldOrder,
    listSql: `
      SELECT
        so.id,
        so.order_code,
        so.ticket_id,
        t.ticket_code,
        so.buyer_channel_id,
        bc.name AS buyer_channel_name,
        so.dispatch_status_id,
        ds.name AS dispatch_status_name,
        so.sold_at,
        so.payout_amount,
        so.customer_name,
        so.created_at,
        so.updated_at
      FROM sold_orders so
      INNER JOIN tickets t ON t.id = so.ticket_id
      INNER JOIN buyer_channels bc ON bc.id = so.buyer_channel_id
      INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
      ORDER BY so.sold_at DESC, so.order_code ASC
    `,
    getSql: `
      SELECT
        so.id,
        so.order_code,
        so.ticket_id,
        t.ticket_code,
        so.buyer_channel_id,
        bc.name AS buyer_channel_name,
        so.dispatch_status_id,
        ds.name AS dispatch_status_name,
        so.sold_at,
        so.payout_amount,
        so.customer_name,
        so.created_at,
        so.updated_at
      FROM sold_orders so
      INNER JOIN tickets t ON t.id = so.ticket_id
      INNER JOIN buyer_channels bc ON bc.id = so.buyer_channel_id
      INNER JOIN dispatch_statuses ds ON ds.id = so.dispatch_status_id
      WHERE so.id = $1
      LIMIT 1
    `,
    mapRow: mapSoldOrderRow,
  },
  {
    key: "users",
    routePath: "users",
    label: "user",
    table: "users",
    readOnly: true,
    fields: [],
    listSql: `
      SELECT id, email, display_name, role, created_at, updated_at
      FROM users
      ORDER BY created_at ASC
    `,
    getSql: `
      SELECT id, email, display_name, role, created_at, updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    mapRow: mapUserRow,
  },
];
