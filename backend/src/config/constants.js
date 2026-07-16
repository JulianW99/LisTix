export const roles = {
  admin: "admin",
  user: "user",
  systemAdmin: "system_admin",
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
