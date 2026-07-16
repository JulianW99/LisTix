import { acceptAnyInvitation, getAnyInvitation } from "../services/invitationService.js";

export const invitationDetails = async (req, res, next) => {
  try {
    const invitation = await getAnyInvitation(req.params.token);
    return invitation
      ? res.json({ invitation })
      : res.status(404).json({ message: "Invitation not found or expired." });
  } catch (error) { return next(error); }
};

export const completeInvitation = async (req, res, next) => {
  try {
    return res.status(201).json(await acceptAnyInvitation(req.params.token, req.body));
  } catch (error) { return next(error); }
};
