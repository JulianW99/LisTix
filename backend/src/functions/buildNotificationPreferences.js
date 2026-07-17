export const userNotificationEvents = [
  { key: "new_sale", label: "New sale", requiredChannels: ["email"] },
  { key: "transfer_reminder", label: "Transfer required", requiredChannels: ["email"] },
  { key: "retransfer", label: "Re-transfer", requiredChannels: ["email", "discord"] },
  { key: "payout_sent", label: "Payout sent", requiredChannels: ["email"] },
  { key: "listing_deleted", label: "Listing deleted", requiredChannels: [] },
  { key: "sale_sent", label: "Sale sent", requiredChannels: [] },
];

export const notificationChannels = ["email", "discord", "pushover"];

export const buildNotificationPreferences = (input = {}, { hasPushoverKey = false } = {}) => (
  Object.fromEntries(userNotificationEvents.map(({ key, requiredChannels }) => {
    const requested = input?.[key] && typeof input[key] === "object" ? input[key] : {};
    const channels = Object.fromEntries(notificationChannels.map((channel) => {
      if (requiredChannels.includes(channel)) return [channel, true];
      if (channel === "pushover" && !hasPushoverKey) return [channel, false];
      return [channel, requested[channel] === true];
    }));
    return [key, channels];
  }))
);

export const notificationPreferenceFor = (profileSettings, eventType) => {
  const pushoverUserKey = String(profileSettings?.pushoverUserKey ?? "").trim();
  const preferences = buildNotificationPreferences(profileSettings?.notificationPreferences, {
    hasPushoverKey: Boolean(pushoverUserKey),
  });
  return preferences[eventType] ?? { email: false, discord: false, pushover: false };
};
