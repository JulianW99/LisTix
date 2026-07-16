import { Router } from "express";
import {
  cancelSale, changeTicketStatus, getActions, getAutomationStatus, getDashboard, getListings, getMarketplaces, getPayments,
  getSale, getSales, getTeam, getTicket, getTickets, getTopics, getUser, getUsers, inviteTeamMember, patchTeamMember, pollMailbox, postTestAction,
  postTopic, putAllMarketplaces, putMarketplace, putUser, removeTeamMember, removeTopic, replyToTicket, resolveAction,
  getVenueMaps, getVenueMapPreview, putVenueMap,
} from "../controllers/systemAdminController.js";
import { authenticate } from "../middleware/authenticate.js";
import { requireSystemAdmin, requireSystemPermission } from "../middleware/requireSystemAdmin.js";

const router = Router();
router.use(authenticate, requireSystemAdmin);
router.get("/users", requireSystemPermission("system.users.view"), getUsers);
router.get("/users/:id", requireSystemPermission("system.users.view"), getUser);
router.put("/users/:id", requireSystemPermission("system.users.manage"), putUser);
router.get("/sales", requireSystemPermission("system.sales.view"), getSales);
router.get("/sales/:id", requireSystemPermission("system.sales.view"), getSale);
router.post("/sales/:id/cancel", requireSystemPermission("system.sales.manage"), cancelSale);
router.get("/listings", requireSystemPermission("system.listings.view"), getListings);
router.get("/venue-maps", requireSystemPermission("system.maps.view"), getVenueMaps);
router.get("/venue-maps/:venueId/preview", requireSystemPermission("system.maps.view"), getVenueMapPreview);
router.put("/venue-maps/:venueId", requireSystemPermission("system.maps.manage"), putVenueMap);
router.get("/payments", requireSystemPermission("system.payments.view"), getPayments);
router.get("/actions", requireSystemPermission("system.actions.view"), getActions);
router.post("/actions/test", requireSystemPermission("system.actions.manage"), postTestAction);
router.put("/actions/:id/resolve", requireSystemPermission("system.actions.manage"), resolveAction);
router.get("/automation/status", requireSystemPermission("system.actions.view"), getAutomationStatus);
router.post("/automation/poll-mailbox", requireSystemPermission("system.actions.manage"), pollMailbox);
router.get("/support/tickets", requireSystemPermission("system.support.view"), getTickets);
router.get("/support/tickets/:id", requireSystemPermission("system.support.view"), getTicket);
router.post("/support/tickets/:id/messages", requireSystemPermission("system.support.manage"), replyToTicket);
router.put("/support/tickets/:id/status", requireSystemPermission("system.support.manage"), changeTicketStatus);
router.get("/support/dashboard", requireSystemPermission("system.support.view"), getDashboard);
router.get("/support/topics", requireSystemPermission("system.support.view"), getTopics);
router.post("/support/topics", requireSystemPermission("system.support.manage"), postTopic);
router.delete("/support/topics/:id", requireSystemPermission("system.support.manage"), removeTopic);
router.get("/marketplaces", requireSystemPermission("system.marketplaces.view"), getMarketplaces);
router.put("/marketplaces/all", requireSystemPermission("system.marketplaces.manage"), putAllMarketplaces);
router.put("/marketplaces/:marketplace", requireSystemPermission("system.marketplaces.manage"), putMarketplace);
router.get("/team", requireSystemPermission("system.team.view"), getTeam);
router.post("/team/invitations", requireSystemPermission("system.team.manage"), inviteTeamMember);
router.patch("/team/members/:id", requireSystemPermission("system.team.manage"), patchTeamMember);
router.delete("/team/members/:id", requireSystemPermission("system.team.manage"), removeTeamMember);
export default router;
