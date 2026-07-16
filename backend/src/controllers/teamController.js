import {
  deleteAccountMember,
  getTeamConfiguration,
  inviteAccountMember,
  listAccountActivity,
  setMultiUserEnabled,
  updateAccountMember,
} from "../services/teamService.js";

export const getTeam = async (req, res, next) => {
  try {
    const result = await getTeamConfiguration(req.user.accountId);
    return result ? res.json(result) : res.status(404).json({ message: "Account not found." });
  } catch (error) { return next(error); }
};

export const updateTeamSettings = async (req, res, next) => {
  try {
    const account = await setMultiUserEnabled(req.user.accountId, req.body.enabled, req.user);
    return account ? res.json({ account }) : res.status(404).json({ message: "Account not found." });
  } catch (error) { return next(error); }
};

export const inviteMember = async (req, res, next) => {
  try {
    return res.status(201).json(await inviteAccountMember(req.user.accountId, req.body, req.user));
  } catch (error) { return next(error); }
};

export const changeMember = async (req, res, next) => {
  try {
    const member = await updateAccountMember(req.user.accountId, req.params.id, req.body, req.user);
    return member ? res.json({ member }) : res.status(404).json({ message: "Team member not found." });
  } catch (error) { return next(error); }
};

export const removeMember = async (req, res, next) => {
  try {
    const removed = await deleteAccountMember(req.user.accountId, req.params.id, req.user);
    return removed ? res.status(204).send() : res.status(404).json({ message: "Team member not found." });
  } catch (error) { return next(error); }
};

export const getActivity = async (req, res, next) => {
  try {
    return res.json({ items: await listAccountActivity(req.user.accountId, req.query.limit) });
  } catch (error) { return next(error); }
};
