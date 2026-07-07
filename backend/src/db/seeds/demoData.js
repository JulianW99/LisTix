const eventCategories = [
  {
    name: "Concert",
    description: "Live music events and arena shows.",
  },
  {
    name: "Sports",
    description: "Sports fixtures with transferable ticket inventory.",
  },
  {
    name: "Comedy",
    description: "Stage shows, comedy nights, and theater-style events.",
  },
];

const venues = [
  {
    name: "Olympiastadion Berlin",
    city: "Berlin",
    country: "Germany",
    timezone: "Europe/Berlin",
  },
  {
    name: "Ziggo Dome",
    city: "Amsterdam",
    country: "Netherlands",
    timezone: "Europe/Amsterdam",
  },
  {
    name: "Olympiapark",
    city: "Munich",
    country: "Germany",
    timezone: "Europe/Berlin",
  },
  {
    name: "O2 Arena",
    city: "London",
    country: "United Kingdom",
    timezone: "Europe/London",
  },
  {
    name: "Wembley Stadium",
    city: "London",
    country: "United Kingdom",
    timezone: "Europe/London",
  },
  {
    name: "Madison Square Garden",
    city: "New York",
    country: "USA",
    timezone: "America/New_York",
  },
];

const events = [
  {
    eventName: "Taylor Swift - Berlin",
    venueName: "Olympiastadion Berlin",
    categoryName: "Concert",
    eventDate: "2026-07-18T18:00:00+02:00",
  },
  {
    eventName: "Drake - Amsterdam",
    venueName: "Ziggo Dome",
    categoryName: "Concert",
    eventDate: "2026-08-02T19:30:00+02:00",
  },
  {
    eventName: "Coldplay - Munich",
    venueName: "Olympiapark",
    categoryName: "Concert",
    eventDate: "2026-09-11T17:45:00+02:00",
  },
  {
    eventName: "Champions League Final Screening",
    venueName: "O2 Arena",
    categoryName: "Sports",
    eventDate: "2026-06-30T20:00:00+01:00",
  },
  {
    eventName: "Ed Sheeran - London",
    venueName: "Wembley Stadium",
    categoryName: "Concert",
    eventDate: "2026-08-20T19:00:00+01:00",
  },
  {
    eventName: "Billie Eilish - New York",
    venueName: "Madison Square Garden",
    categoryName: "Concert",
    eventDate: "2026-10-05T20:00:00-04:00",
  },
];

const seatSections = [
  {
    venueName: "Olympiastadion Berlin",
    name: "Block 112",
    rowLabel: "12",
    seatLabel: "1-2",
    capacity: 120,
  },
  {
    venueName: "Olympiastadion Berlin",
    name: "Block 220",
    rowLabel: "5",
    seatLabel: "18-21",
    capacity: 160,
  },
  {
    venueName: "Ziggo Dome",
    name: "Floor A",
    rowLabel: "",
    seatLabel: "Standing",
    capacity: 420,
  },
  {
    venueName: "Olympiapark",
    name: "Block L1",
    rowLabel: "8",
    seatLabel: "10-11",
    capacity: 110,
  },
  {
    venueName: "O2 Arena",
    name: "Lower 101",
    rowLabel: "14",
    seatLabel: "7-10",
    capacity: 130,
  },
  {
    venueName: "Wembley Stadium",
    name: "Block 502",
    rowLabel: "10",
    seatLabel: "21-22",
    capacity: 200,
  },
  {
    venueName: "Madison Square Garden",
    name: "Section 101",
    rowLabel: "15",
    seatLabel: "5-6",
    capacity: 150,
  },
  {
    venueName: "Olympiastadion Berlin",
    name: "Block 305",
    rowLabel: "3",
    seatLabel: "4-5",
    capacity: 140,
  },
];

const marketplaceStatuses = [
  {
    name: "Draft",
    description: "Inventory is captured but not listed yet.",
  },
  {
    name: "Needs pricing",
    description: "Ticket exists but requires a resale price.",
  },
  {
    name: "Listed",
    description: "Ticket is ready for marketplace sale.",
  },
  {
    name: "Sold",
    description: "Ticket has sold and should be handled through dispatch.",
  },
  {
    name: "Archived",
    description: "Ticket is no longer part of active operations.",
  },
];

const buyerChannels = [
  {
    name: "StubHub",
    description: "Order imported or reconciled from StubHub.",
  },
  {
    name: "Viagogo",
    description: "Order imported or reconciled from Viagogo.",
  },
  {
    name: "Ticketmaster Exchange",
    description: "Order imported or reconciled from Ticketmaster Exchange.",
  },
  {
    name: "Manual Buyer",
    description: "Buyer captured manually outside marketplace automation.",
  },
];

const dispatchStatuses = [
  {
    name: "Awaiting transfer",
    description: "Sold ticket still needs wallet or platform transfer.",
    isTerminal: false,
  },
  {
    name: "Ready to send",
    description: "Order is verified and ready for dispatch.",
    isTerminal: false,
  },
  {
    name: "Completed",
    description: "Dispatch has been completed.",
    isTerminal: true,
  },
];

const ticketRestrictions = [
  {
    name: "No restrictions",
    description: "No known delivery, view, or entry restrictions.",
  },
  {
    name: "Restricted view",
    description: "Seat has a partially restricted view.",
  },
  {
    name: "Mobile transfer only",
    description: "Ticket must be delivered through mobile transfer.",
  },
  {
    name: "Under 18 accompanied",
    description: "Underage buyers must be accompanied by an adult.",
  },
];

const tickets = [
  {
    ticketCode: "TCK-1001",
    eventName: "Taylor Swift - Berlin",
    sectionName: "Block 112",
    marketplaceStatusName: "Draft",
    restrictionName: "Mobile transfer only",
    quantity: 2,
    rowLabel: "12",
    lowestSeat: 1,
    purchasePrice: 189.5,
    askingPrice: 265,
    notes: "Prime lower-bowl pair with fast transfer.",
  },
  {
    ticketCode: "TCK-1002",
    eventName: "Drake - Amsterdam",
    sectionName: "Floor A",
    marketplaceStatusName: "Listed",
    restrictionName: "No restrictions",
    quantity: 4,
    rowLabel: "GA",
    lowestSeat: 1,
    purchasePrice: 122,
    askingPrice: 175,
    notes: "Standing tickets from original allocation.",
  },
  {
    ticketCode: "TCK-1003",
    eventName: "Coldplay - Munich",
    sectionName: "Block L1",
    marketplaceStatusName: "Needs pricing",
    restrictionName: "Restricted view",
    quantity: 2,
    rowLabel: "8",
    lowestSeat: 10,
    purchasePrice: 149,
    askingPrice: 198,
    notes: "Needs fresh competitor pricing before syndication.",
  },
  {
    ticketCode: "TCK-1004",
    eventName: "Champions League Final Screening",
    sectionName: "Lower 101",
    marketplaceStatusName: "Listed",
    restrictionName: "Under 18 accompanied",
    quantity: 4,
    rowLabel: "14",
    lowestSeat: 7,
    purchasePrice: 64,
    askingPrice: 110,
    notes: "Good group block for last-minute local buyers.",
  },
  {
    ticketCode: "TCK-1005",
    eventName: "Ed Sheeran - London",
    sectionName: "Block 502",
    marketplaceStatusName: "Listed",
    restrictionName: "No restrictions",
    quantity: 2,
    rowLabel: "10",
    lowestSeat: 21,
    purchasePrice: 110,
    askingPrice: 180,
    notes: "Upper tier, clear view.",
  },
  {
    ticketCode: "TCK-1006",
    eventName: "Billie Eilish - New York",
    sectionName: "Section 101",
    marketplaceStatusName: "Draft",
    restrictionName: "Mobile transfer only",
    quantity: 2,
    rowLabel: "15",
    lowestSeat: 5,
    purchasePrice: 250,
    askingPrice: 400,
    notes: "Excellent lower bowl seats.",
  },
  {
    ticketCode: "TCK-1007",
    eventName: "Taylor Swift - Berlin",
    sectionName: "Block 305",
    marketplaceStatusName: "Sold",
    restrictionName: "No restrictions",
    quantity: 2,
    rowLabel: "3",
    lowestSeat: 4,
    purchasePrice: 150,
    askingPrice: 220,
    notes: "Sold to a private buyer.",
  },
  {
    ticketCode: "TCK-1008",
    eventName: "Ed Sheeran - London",
    sectionName: "Block 502",
    marketplaceStatusName: "Listed",
    restrictionName: "No restrictions",
    quantity: 2,
    rowLabel: "10",
    lowestSeat: 23,
    purchasePrice: 118,
    askingPrice: 190,
    notes: "Strong-margin pair with clear view.",
  },
  {
    ticketCode: "TCK-1009",
    eventName: "Billie Eilish - New York",
    sectionName: "Section 101",
    marketplaceStatusName: "Sold",
    restrictionName: "Mobile transfer only",
    quantity: 2,
    rowLabel: "15",
    lowestSeat: 7,
    purchasePrice: 240,
    askingPrice: 385,
    notes: "Hot lower-bowl pair already matched to a buyer.",
  },
  {
    ticketCode: "TCK-1010",
    eventName: "Drake - Amsterdam",
    sectionName: "Floor A",
    marketplaceStatusName: "Needs pricing",
    restrictionName: "No restrictions",
    quantity: 2,
    rowLabel: "GA",
    lowestSeat: 1,
    purchasePrice: 130,
    askingPrice: 0,
    notes: "Awaiting fresh comp check before listing.",
  },
  {
    ticketCode: "TCK-1011",
    eventName: "Coldplay - Munich",
    sectionName: "Block L1",
    marketplaceStatusName: "Draft",
    restrictionName: "Restricted view",
    quantity: 2,
    rowLabel: "8",
    lowestSeat: 12,
    purchasePrice: 145,
    askingPrice: 205,
    notes: "Draft listing prepared for next pricing pass.",
  },
];

const soldOrders = [
  {
    orderCode: "ORD-5001",
    ticketCode: "TCK-1002",
    buyerChannelName: "StubHub",
    dispatchStatusName: "Awaiting transfer",
    soldAt: "2026-06-26T11:20:00+02:00",
    payoutAmount: 680,
    customerName: "Jamie W.",
  },
  {
    orderCode: "ORD-5002",
    ticketCode: "TCK-1001",
    buyerChannelName: "Viagogo",
    dispatchStatusName: "Ready to send",
    soldAt: "2026-06-27T08:05:00+02:00",
    payoutAmount: 510,
    customerName: "Riley K.",
  },
  {
    orderCode: "ORD-5003",
    ticketCode: "TCK-1004",
    buyerChannelName: "Manual Buyer",
    dispatchStatusName: "Completed",
    soldAt: "2026-06-19T16:35:00+02:00",
    payoutAmount: 420,
    customerName: "Morgan P.",
  },
  {
    orderCode: "ORD-5004",
    ticketCode: "TCK-1005",
    buyerChannelName: "Ticketmaster Exchange",
    dispatchStatusName: "Awaiting transfer",
    soldAt: "2026-07-01T14:00:00+01:00",
    payoutAmount: 340,
    customerName: "Alex T.",
  },
  {
    orderCode: "ORD-5005",
    ticketCode: "TCK-1007",
    buyerChannelName: "Manual Buyer",
    dispatchStatusName: "Completed",
    soldAt: "2026-07-02T10:00:00+02:00",
    payoutAmount: 400,
    customerName: "Casey B.",
  },
  {
    orderCode: "ORD-5006",
    ticketCode: "TCK-1008",
    buyerChannelName: "StubHub",
    dispatchStatusName: "Ready to send",
    soldAt: "2026-07-03T15:10:00+01:00",
    payoutAmount: 365,
    customerName: "Taylor N.",
  },
  {
    orderCode: "ORD-5007",
    ticketCode: "TCK-1009",
    buyerChannelName: "Ticketmaster Exchange",
    dispatchStatusName: "Awaiting transfer",
    soldAt: "2026-07-04T09:25:00-04:00",
    payoutAmount: 720,
    customerName: "Jordan L.",
  },
  {
    orderCode: "ORD-5008",
    ticketCode: "TCK-1002",
    buyerChannelName: "Manual Buyer",
    dispatchStatusName: "Completed",
    soldAt: "2026-07-05T18:45:00+02:00",
    payoutAmount: 700,
    customerName: "Sam R.",
  },
];

const indexBy = (items, key) =>
  items.reduce((result, item) => {
    result[item[key]] = item.id;
    return result;
  }, {});

export const seedDemoData = async (client) => {
  console.log("🌱 Starting to seed demo data...");

  try {
    const categoryRows = [];
    for (const category of eventCategories) {
      const result = await client.query(
        `
          INSERT INTO event_categories (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, name
        `,
        [category.name, category.description],
      );
      categoryRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${categoryRows.length} event categories.`);

    const venueRows = [];
    for (const venue of venues) {
      const result = await client.query(
        `
          INSERT INTO venues (name, city, country, timezone)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (name, city) DO UPDATE SET
            country = EXCLUDED.country,
            timezone = EXCLUDED.timezone,
            updated_at = NOW()
          RETURNING id, name
        `,
        [venue.name, venue.city, venue.country, venue.timezone],
      );
      venueRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${venueRows.length} venues.`);

    const categoryIds = indexBy(categoryRows, "name");
    const venueIds = indexBy(venueRows, "name");

    const eventRows = [];
    for (const event of events) {
      const result = await client.query(
        `
          INSERT INTO events (event_name, venue_id, category_id, event_date)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (event_name, venue_id, event_date) DO UPDATE SET
            category_id = EXCLUDED.category_id,
            updated_at = NOW()
          RETURNING id, event_name
        `,
        [
          event.eventName,
          venueIds[event.venueName],
          categoryIds[event.categoryName],
          event.eventDate,
        ],
      );
      eventRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${eventRows.length} events.`);

    const sectionRows = [];
    for (const section of seatSections) {
      const result = await client.query(
        `
          INSERT INTO seat_sections (venue_id, name, row_label, seat_label, capacity)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (venue_id, name, row_label, seat_label) DO UPDATE SET
            capacity = EXCLUDED.capacity,
            updated_at = NOW()
          RETURNING id, venue_id, name
        `,
        [
          venueIds[section.venueName],
          section.name,
          section.rowLabel,
          section.seatLabel,
          section.capacity,
        ],
      );
      sectionRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${sectionRows.length} seat sections.`);

    const statusRows = [];
    for (const status of marketplaceStatuses) {
      const result = await client.query(
        `
          INSERT INTO marketplace_statuses (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, name
        `,
        [status.name, status.description],
      );
      statusRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${statusRows.length} marketplace statuses.`);

    const channelRows = [];
    for (const channel of buyerChannels) {
      const result = await client.query(
        `
          INSERT INTO buyer_channels (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, name
        `,
        [channel.name, channel.description],
      );
      channelRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${channelRows.length} buyer channels.`);

    const dispatchRows = [];
    for (const status of dispatchStatuses) {
      const result = await client.query(
        `
          INSERT INTO dispatch_statuses (name, description, is_terminal)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            is_terminal = EXCLUDED.is_terminal,
            updated_at = NOW()
          RETURNING id, name
        `,
        [status.name, status.description, status.isTerminal],
      );
      dispatchRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${dispatchRows.length} dispatch statuses.`);

    const restrictionRows = [];
    for (const restriction of ticketRestrictions) {
      const result = await client.query(
        `
          INSERT INTO ticket_restrictions (name, description)
          VALUES ($1, $2)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = NOW()
          RETURNING id, name
        `,
        [restriction.name, restriction.description],
      );
      restrictionRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${restrictionRows.length} ticket restrictions.`);

    const eventIds = indexBy(eventRows, "event_name");
    const statusIds = indexBy(statusRows, "name");
    const channelIds = indexBy(channelRows, "name");
    const dispatchIds = indexBy(dispatchRows, "name");
    const restrictionIds = indexBy(restrictionRows, "name");
    const sectionIds = sectionRows.reduce((result, section) => {
      result[`${section.venue_id}:${section.name}`] = section.id;
      return result;
    }, {});

    const eventVenueRows = await client.query(
      "SELECT id, event_name, venue_id FROM events",
    );
    const eventVenueIds = eventVenueRows.rows.reduce((result, event) => {
      result[event.event_name] = event.venue_id;
      return result;
    }, {});

    const ticketRows = [];
    for (const ticket of tickets) {
      const eventId = eventIds[ticket.eventName];
      const venueId = eventVenueIds[ticket.eventName];
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
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (ticket_code) DO UPDATE SET
            event_id = EXCLUDED.event_id,
            section_id = EXCLUDED.section_id,
            marketplace_status_id = EXCLUDED.marketplace_status_id,
            restriction_id = EXCLUDED.restriction_id,
            quantity = EXCLUDED.quantity,
            row_label = EXCLUDED.row_label,
            lowest_seat = EXCLUDED.lowest_seat,
            purchase_price = EXCLUDED.purchase_price,
            asking_price = EXCLUDED.asking_price,
            notes = EXCLUDED.notes,
            updated_at = NOW()
          RETURNING id, ticket_code
        `,
        [
          ticket.ticketCode,
          eventId,
          sectionIds[`${venueId}:${ticket.sectionName}`],
          statusIds[ticket.marketplaceStatusName],
          restrictionIds[ticket.restrictionName],
          ticket.quantity,
          ticket.rowLabel,
          ticket.lowestSeat,
          ticket.purchasePrice,
          ticket.askingPrice,
          ticket.notes,
        ],
      );
      ticketRows.push(result.rows[0]);
    }
    console.log(`   - Seeded ${ticketRows.length} tickets.`);

    const ticketIds = indexBy(ticketRows, "ticket_code");

    for (const order of soldOrders) {
      await client.query(
        `
          INSERT INTO sold_orders (
            order_code,
            ticket_id,
            buyer_channel_id,
            dispatch_status_id,
            sold_at,
            payout_amount,
            customer_name
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (order_code) DO UPDATE SET
            ticket_id = EXCLUDED.ticket_id,
            buyer_channel_id = EXCLUDED.buyer_channel_id,
            dispatch_status_id = EXCLUDED.dispatch_status_id,
            sold_at = EXCLUDED.sold_at,
            payout_amount = EXCLUDED.payout_amount,
            customer_name = EXCLUDED.customer_name,
            updated_at = NOW()
        `,
        [
          order.orderCode,
          ticketIds[order.ticketCode],
          channelIds[order.buyerChannelName],
          dispatchIds[order.dispatchStatusName],
          order.soldAt,
          order.payoutAmount,
          order.customerName,
        ],
      );
    }
    console.log(`   - Seeded ${soldOrders.length} sold orders.`);
    console.log("✅ Demo data seeded successfully.");
  } catch (error) {
    console.error("❌ Error seeding demo data. Rolled back transaction.", error);
    throw error;
  }
};
