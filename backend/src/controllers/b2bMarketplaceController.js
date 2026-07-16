import { createB2BInquiry, listB2BEvents } from "../services/b2bMarketplaceService.js";

export const getB2BEvents = async (_req, res, next) => {
  try { return res.json({ items: await listB2BEvents() }); }
  catch (error) { return next(error); }
};

export const postB2BInquiry = async (req, res, next) => {
  try {
    const result = await createB2BInquiry(req.body, req.user);
    return res.status(201).json({ inquiry: result.inquiry, user: null });
  } catch (error) { return next(error); }
};
