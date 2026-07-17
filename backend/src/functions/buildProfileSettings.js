import { buildNotificationPreferences } from "./buildNotificationPreferences.js";

const defaults = {
  discordHandle: "", discordUserId: "", addressLine1: "", addressLine2: "",
  postalCode: "", city: "", country: "", payoutMethod: "Bank transfer",
  payoutAccountHolder: "", payoutIban: "", payoutBic: "", payoutBankName: "",
  revolutRevtag: "", paymentCardBrand: "Visa", paymentCardNumber: "",
  paymentCardCvv: "", paymentCardExpiryMonth: "01", paymentCardExpiryYear: "",
  paymentCardLast4: "", paymentCardExpiry: "", pushoverUserKey: "",
  sheetsGoogleAccount: "", sheetsDocumentUrl: "",
  sheetsConfirmationMode: "discord-confirmation", tikeyConnected: false,
  ticketmasterAccountsCsv: "", axsAccountsCsv: "",
};

export const buildProfileSettings = (input = {}) => {
  const settings = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, input[key] ?? fallback]),
  );
  settings.notificationPreferences = buildNotificationPreferences(input.notificationPreferences, {
    hasPushoverKey: Boolean(String(settings.pushoverUserKey).trim()),
  });
  return settings;
};
