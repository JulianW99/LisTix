import { createBuyerChannelsTableSql } from "./buyerChannels.js";
import { createDispatchStatusesTableSql } from "./dispatchStatuses.js";
import { createEventCategoriesTableSql } from "./eventCategories.js";
import { createEventsTableSql } from "./events.js";
import { createMarketplaceStatusesTableSql } from "./marketplaceStatuses.js";
import { createSeatSectionsTableSql } from "./seatSections.js";
import { createSoldOrdersTableSql } from "./soldOrders.js";
import { createTicketRestrictionsTableSql } from "./ticketRestrictions.js";
import { createTicketsTableSql } from "./tickets.js";
import { createSupportTablesSql } from "./support.js";
import { createUsersTableSql } from "./users.js";
import { createVenuesTableSql } from "./venues.js";

export const schemaStatements = [
  createUsersTableSql,
  createEventCategoriesTableSql,
  createVenuesTableSql,
  createEventsTableSql,
  createSeatSectionsTableSql,
  createMarketplaceStatusesTableSql,
  createBuyerChannelsTableSql,
  createDispatchStatusesTableSql,
  createTicketRestrictionsTableSql,
  createTicketsTableSql,
  createSoldOrdersTableSql,
  createSupportTablesSql,
];
