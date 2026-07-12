const topics = ["Account & Access", "Listing Issue", "Payment & Payout", "Marketplace Sync", "Other"];

export const seedSupportDemoData = async (client) => {
  for (const name of topics) {
    await client.query(`INSERT INTO support_topics (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET is_active = TRUE`, [name]);
  }

  const demos = [
    { code: "SUP-DEMO-001", email: "demo.alex@listix.local", topic: "Listing Issue", status: "open", text: "One of my active listings is not synchronizing to the marketplace." },
    { code: "SUP-DEMO-002", email: "demo.jamie@listix.local", topic: "Payment & Payout", status: "in_progress", text: "The latest payout is still marked as processing." },
    { code: "SUP-DEMO-003", email: "demo.taylor@listix.local", topic: "Account & Access", status: "resolved", text: "I could not update my account details." },
  ];

  for (const ticket of demos) {
    const result = await client.query(`
      INSERT INTO support_tickets (ticket_code, user_id, topic_id, status, closed_at)
      SELECT $1, u.id, tp.id, $4::varchar, CASE WHEN $4::varchar IN ('resolved', 'closed') THEN NOW() ELSE NULL END
      FROM users u CROSS JOIN support_topics tp WHERE u.email = $2 AND tp.name = $3
      ON CONFLICT (ticket_code) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
      RETURNING id, user_id
    `, [ticket.code, ticket.email, ticket.topic, ticket.status]);
    if (result.rows[0]) {
      await client.query(`
        INSERT INTO support_messages (ticket_id, author_user_id, body)
        SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM support_messages WHERE ticket_id = $1)
      `, [result.rows[0].id, result.rows[0].user_id, ticket.text]);
    }
  }
};
