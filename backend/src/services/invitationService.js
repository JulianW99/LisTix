import { acceptInvitation as acceptAccountInvitation, getInvitation as getAccountInvitation } from "./teamService.js";
import { acceptSystemInvitation, getSystemInvitation } from "./systemAccessService.js";

export const getAnyInvitation = async (token) => {
  const systemInvitation = await getSystemInvitation(token);
  if (systemInvitation) return systemInvitation;
  const accountInvitation = await getAccountInvitation(token);
  return accountInvitation ? { ...accountInvitation, invitationType: "account" } : null;
};

export const acceptAnyInvitation = async (token, payload) => {
  const systemInvitation = await getSystemInvitation(token);
  return systemInvitation
    ? acceptSystemInvitation(token, payload)
    : acceptAccountInvitation(token, payload);
};
