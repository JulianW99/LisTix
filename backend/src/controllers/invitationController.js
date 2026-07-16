import { acceptInvitation, getInvitation } from "../services/teamService.js";

export const invitationDetails = async (req, res, next) => {
  try {
    const invitation = await getInvitation(req.params.token);
    return invitation
      ? res.json({ invitation })
      : res.status(404).json({ message: "Invitation not found or expired." });
  } catch (error) { return next(error); }
};

export const completeInvitation = async (req, res, next) => {
  try {
    return res.status(201).json(await acceptInvitation(req.params.token, req.body));
  } catch (error) { return next(error); }
};
