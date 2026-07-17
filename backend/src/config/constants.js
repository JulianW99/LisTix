export const roles = {
  admin: "admin",
  user: "user",
  buyer: "buyer",
  systemAdmin: "system_admin",
  systemStaff: "system_staff",
};

export const systemPermissions = [
  "system.users.view", "system.users.manage",
  "system.sales.view", "system.sales.manage",
  "system.listings.view",
  "system.payments.view",
  "system.actions.view", "system.actions.manage",
  "system.support.view", "system.support.manage",
  "system.marketplaces.view", "system.marketplaces.manage",
  "system.maps.view", "system.maps.manage",
  "system.team.view", "system.team.manage",
  "system.notifications.view", "system.notifications.manage",
];

export const systemRolePresets = {
  administrator: [...systemPermissions],
  moderator: [
    "system.users.view", "system.sales.view", "system.sales.manage",
    "system.listings.view", "system.actions.view", "system.actions.manage",
    "system.support.view", "system.support.manage", "system.marketplaces.view", "system.maps.view",
    "system.notifications.view",
  ],
  support: [
    "system.users.view", "system.sales.view", "system.listings.view",
    "system.actions.view", "system.support.view", "system.support.manage", "system.notifications.view",
  ],
  viewer: [
    "system.users.view", "system.sales.view", "system.listings.view",
    "system.payments.view", "system.actions.view", "system.support.view",
    "system.marketplaces.view", "system.maps.view", "system.notifications.view",
  ],
};

export const accountPermissions = [
  "dashboard.view",
  "listings.view",
  "listings.create",
  "listings.edit",
  "listings.delete",
  "sales.view",
  "sales.fulfill",
  "payments.view",
  "integrations.view",
  "integrations.manage",
  "settings.view",
  "settings.manage",
  "team.view",
  "team.manage",
  "audit.view",
];

export const accountRolePresets = {
  administrator: [...accountPermissions],
  manager: [
    "dashboard.view", "listings.view", "listings.create", "listings.edit",
    "sales.view", "sales.fulfill", "payments.view", "integrations.view",
    "settings.view", "team.view", "audit.view",
  ],
  moderator: [
    "dashboard.view", "listings.view", "listings.edit", "sales.view",
    "sales.fulfill", "payments.view", "integrations.view", "settings.view",
    "audit.view",
  ],
  viewer: [
    "dashboard.view", "listings.view", "sales.view", "payments.view",
    "integrations.view", "settings.view",
  ],
};
