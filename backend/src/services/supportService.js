import { pool } from "../db/pool.js";

const ticketSelect = `
  SELECT st.id, st.ticket_code, st.user_id, u.email, u.display_name,
    st.topic_id, tp.name AS topic, st.status, st.created_at, st.updated_at, st.closed_at,
    (SELECT body FROM support_messages WHERE ticket_id = st.id ORDER BY created_at ASC LIMIT 1) AS initial_message,
    (SELECT COUNT(*)::int FROM support_messages WHERE ticket_id = st.id) AS message_count
  FROM support_tickets st
  INNER JOIN users u ON u.id = st.user_id
  INNER JOIN support_topics tp ON tp.id = st.topic_id
`;

const mapMessage = (row) => ({
  id: Number(row.id),
  ticketId: Number(row.ticket_id),
  authorUserId: Number(row.author_user_id),
  authorName: row.display_name,
  authorRole: row.role,
  body: row.body,
  createdAt: row.created_at,
});

const mapTicket = (row) => ({
  id: Number(row.id),
  ticketId: row.ticket_code,
  userId: Number(row.user_id),
  userEmail: row.email,
  userName: row.display_name,
  topicId: Number(row.topic_id),
  topic: row.topic,
  status: row.status,
  text: row.initial_message,
  messageCount: Number(row.message_count),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  closedAt: row.closed_at,
});

export const listActiveTopics = async () => {
  const result = await pool.query(`
    SELECT id, name, is_active, created_at, updated_at
    FROM support_topics
    WHERE is_active = TRUE
    ORDER BY name ASC
  `);
  return result.rows.map((row) => ({ id: Number(row.id), name: row.name, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at }));
};

export const listAllTopics = async () => {
  const result = await pool.query(`SELECT id, name, is_active, created_at, updated_at FROM support_topics ORDER BY name ASC`);
  return result.rows.map((row) => ({ id: Number(row.id), name: row.name, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at }));
};

export const createTopic = async (name) => {
  const cleanName = String(name ?? "").trim();
  if (!cleanName) { const error = new Error("Topic name is required."); error.statusCode = 400; throw error; }
  const result = await pool.query(`
    INSERT INTO support_topics (name) VALUES ($1)
    ON CONFLICT (name) DO UPDATE SET is_active = TRUE, updated_at = NOW()
    RETURNING id, name, is_active, created_at, updated_at
  `, [cleanName]);
  const row = result.rows[0];
  return { id: Number(row.id), name: row.name, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at };
};

export const deleteTopic = async (id) => {
  const result = await pool.query(`UPDATE support_topics SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, name, is_active, created_at, updated_at`, [id]);
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return { id: Number(row.id), name: row.name, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at };
};

export const listUserSupportTickets = async (userId) => {
  const result = await pool.query(`${ticketSelect} WHERE st.user_id = $1 ORDER BY st.updated_at DESC`, [userId]);
  return result.rows.map(mapTicket);
};

export const listSystemSupportTickets = async ({ scope = "live", from, to } = {}) => {
  const conditions = [scope === "history" ? "st.status IN ('resolved', 'closed')" : "st.status IN ('open', 'in_progress')"];
  const values = [];
  if (from) { values.push(from); conditions.push(`st.created_at >= $${values.length}`); }
  if (to) { values.push(to); conditions.push(`st.created_at < ($${values.length}::date + INTERVAL '1 day')`); }
  const result = await pool.query(`${ticketSelect} WHERE ${conditions.join(" AND ")} ORDER BY st.updated_at DESC`, values);
  return result.rows.map(mapTicket);
};

export const getSupportTicket = async (id, { userId, allowAll = false } = {}) => {
  const values = [id];
  const ownerCondition = allowAll ? "" : ` AND st.user_id = $2`;
  if (!allowAll) values.push(userId);
  const ticketResult = await pool.query(`${ticketSelect} WHERE (st.id::text = $1 OR st.ticket_code = $1)${ownerCondition} LIMIT 1`, values);
  if (!ticketResult.rows[0]) return null;
  const ticket = mapTicket(ticketResult.rows[0]);
  const messageResult = await pool.query(`
    SELECT sm.id, sm.ticket_id, sm.author_user_id, u.display_name, u.role, sm.body, sm.created_at
    FROM support_messages sm INNER JOIN users u ON u.id = sm.author_user_id
    WHERE sm.ticket_id = $1 ORDER BY sm.created_at ASC, sm.id ASC
  `, [ticket.id]);
  return { ...ticket, messages: messageResult.rows.map(mapMessage) };
};

export const createSupportTicket = async ({ topicId, text }, userId) => {
  const body = String(text ?? "").trim();
  if (!body) { const error = new Error("Ticket text is required."); error.statusCode = 400; throw error; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const topic = await client.query("SELECT id FROM support_topics WHERE id = $1 AND is_active = TRUE", [topicId]);
    if (!topic.rows[0]) { const error = new Error("Selected support topic is not available."); error.statusCode = 400; throw error; }
    const ticketResult = await client.query("INSERT INTO support_tickets (user_id, topic_id) VALUES ($1, $2) RETURNING id", [userId, topicId]);
    const id = Number(ticketResult.rows[0].id);
    const ticketCode = `SUP-${String(id).padStart(6, "0")}`;
    await client.query("UPDATE support_tickets SET ticket_code = $1 WHERE id = $2", [ticketCode, id]);
    await client.query("INSERT INTO support_messages (ticket_id, author_user_id, body) VALUES ($1, $2, $3)", [id, userId, body]);
    await client.query("COMMIT");
    return getSupportTicket(id, { userId });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
};

export const addSupportMessage = async (ticketIdentifier, body, authorUserId, { allowAll = false } = {}) => {
  const text = String(body ?? "").trim();
  if (!text) { const error = new Error("Message text is required."); error.statusCode = 400; throw error; }
  const ticket = await getSupportTicket(ticketIdentifier, { userId: authorUserId, allowAll });
  if (!ticket) return null;
  await pool.query(`INSERT INTO support_messages (ticket_id, author_user_id, body) VALUES ($1, $2, $3)`, [ticket.id, authorUserId, text]);
  await pool.query(`UPDATE support_tickets SET updated_at = NOW() WHERE id = $1`, [ticket.id]);
  return getSupportTicket(ticket.id, { userId: authorUserId, allowAll });
};

export const updateSupportTicketStatus = async (ticketIdentifier, status) => {
  const allowed = new Set(["open", "in_progress", "resolved", "closed"]);
  if (!allowed.has(status)) { const error = new Error("Invalid support ticket status."); error.statusCode = 400; throw error; }
  const result = await pool.query(`
    UPDATE support_tickets SET status = $1::varchar, updated_at = NOW(),
      closed_at = CASE WHEN $1::varchar IN ('resolved', 'closed') THEN NOW() ELSE NULL END
    WHERE id::text = $2 OR ticket_code = $2 RETURNING id
  `, [status, String(ticketIdentifier)]);
  return result.rows[0] ? getSupportTicket(result.rows[0].id, { allowAll: true }) : null;
};

export const getSupportDashboard = async ({ scope = "live", from, to } = {}) => {
  const tickets = await listSystemSupportTickets({ scope, from, to });
  const counts = tickets.reduce((result, ticket) => {
    const current = result.get(ticket.topic) ?? { topicId: ticket.topicId, topic: ticket.topic, count: 0 };
    current.count += 1;
    result.set(ticket.topic, current);
    return result;
  }, new Map());
  const topics = await listAllTopics();
  const dashboardTopics = topics
    .filter((topic) => topic.isActive || counts.has(topic.name))
    .map((topic) => counts.get(topic.name) ?? { topicId: topic.id, topic: topic.name, count: 0 })
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
  return { scope, total: tickets.length, topics: dashboardTopics };
};

export const listUsersWithMetrics = async () => {
  const result = await pool.query(`
    WITH inventory AS (
      SELECT t.user_id,
        COUNT(*) FILTER (WHERE ms.name <> 'Sold')::int AS online_tickets,
        COALESCE(SUM(t.asking_price * t.quantity) FILTER (WHERE ms.name <> 'Sold'), 0)::float AS online_ticket_value
      FROM tickets t INNER JOIN marketplace_statuses ms ON ms.id = t.marketplace_status_id
      GROUP BY t.user_id
    ), revenue AS (
      SELECT t.user_id,
        COALESCE(SUM(so.payout_amount) FILTER (WHERE so.sold_at >= NOW() - INTERVAL '1 year'), 0)::float AS revenue_ltm,
        COALESCE(SUM(so.payout_amount) FILTER (WHERE so.sold_at >= date_trunc('month', NOW()) - INTERVAL '1 month' AND so.sold_at < date_trunc('month', NOW())), 0)::float AS revenue_last_month
      FROM sold_orders so INNER JOIN tickets t ON t.id = so.ticket_id GROUP BY t.user_id
    ), support AS (
      SELECT user_id, COUNT(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS open_support_tickets
      FROM support_tickets GROUP BY user_id
    )
    SELECT u.id, u.email, u.display_name, u.role, u.created_at,
      COALESCE(i.online_tickets, 0)::int AS online_tickets,
      COALESCE(i.online_ticket_value, 0)::float AS online_ticket_value,
      COALESCE(r.revenue_ltm, 0)::float AS revenue_ltm,
      COALESCE(r.revenue_last_month, 0)::float AS revenue_last_month,
      COALESCE(s.open_support_tickets, 0)::int AS open_support_tickets
    FROM users u
    LEFT JOIN inventory i ON i.user_id = u.id
    LEFT JOIN revenue r ON r.user_id = u.id
    LEFT JOIN support s ON s.user_id = u.id
    WHERE u.role <> 'system_admin'
    ORDER BY u.created_at ASC
  `);
  return result.rows.map((row) => ({ id: Number(row.id), email: row.email, displayName: row.display_name, role: row.role, onlineTickets: Number(row.online_tickets), onlineTicketValue: Number(row.online_ticket_value), revenueLtm: Number(row.revenue_ltm), revenueLastMonth: Number(row.revenue_last_month), openSupportTickets: Number(row.open_support_tickets), status: Number(row.open_support_tickets) > 0 ? "Action required" : "OK", createdAt: row.created_at }));
};
