import crypto from "crypto";
import { env, isProduction } from "../config/env.js";
import { isTeamAccessPaused, loadUserAccess, teamAccessPausedMessage } from "../services/accountAccessService.js";
import {
  buildDiscordAuthorizationUrl,
  connectDiscordAccount,
  disconnectDiscordAccount,
  exchangeDiscordCode,
  fetchDiscordUser,
  getDiscordConnection,
  isDiscordConfigured,
} from "../services/discordAuthService.js";
import { signDiscordState, verifyDiscordState } from "../utils/jwt.js";
import { setSessionCookie } from "./authController.js";

const stateCookieName = `${env.cookieName}_discord_oauth`;
const stateCookieBaseOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: isProduction,
});
const stateCookieOptions = () => ({
  ...stateCookieBaseOptions(),
  maxAge: 10 * 60 * 1000,
});

const buildFrontendUrl = (pathname, params = {}, hash = "") => {
  const url = new URL(pathname, env.frontendUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, String(value));
  });
  url.hash = hash;
  return url.toString();
};

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const beginDiscordAuthorization = (req, res, next) => {
  try {
    if (!isDiscordConfigured()) {
      return res.status(503).json({ message: "Discord connection is not configured on the server." });
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    const state = signDiscordState({
      intent: "connect",
      nonce,
      sub: req.user.sub,
      accountId: req.user.accountId,
    });
    res.cookie(stateCookieName, nonce, stateCookieOptions());
    return res.json({ authorizationUrl: buildDiscordAuthorizationUrl(state) });
  } catch (error) {
    return next(error);
  }
};

export const startDiscordConnect = (req, res, next) => beginDiscordAuthorization(req, res, next);

export const discordCallback = async (req, res) => {
  try {
    const state = verifyDiscordState(String(req.query.state || ""));
    if (state.intent !== "connect" || !state.sub) {
      throw new Error("Discord must be connected from Settings while signed in to LisTix.");
    }
    if (!safeEqual(state.nonce, req.cookies[stateCookieName])) {
      throw new Error("Discord authorization expired or could not be verified. Please try again.");
    }
    res.clearCookie(stateCookieName, stateCookieBaseOptions());

    if (req.query.error) {
      throw new Error(req.query.error_description || "Discord authorization was cancelled.");
    }
    if (!req.query.code) {
      throw new Error("Discord did not return an authorization code.");
    }

    const token = await exchangeDiscordCode(String(req.query.code));
    const discordUser = await fetchDiscordUser(token.access_token);
    const scopes = String(token.scope || "identify").split(/\s+/).filter(Boolean);

    const access = await loadUserAccess(Number(state.sub), state.accountId ? Number(state.accountId) : undefined);
    if (!access) throw new Error("Your LisTix account access is no longer active.");
    if (isTeamAccessPaused(access)) throw new Error(teamAccessPausedMessage);

    await connectDiscordAccount({
      userId: access.id,
      accountId: access.account?.id ?? null,
      discordUser,
      scopes,
    });
    setSessionCookie(res, access);
    return res.redirect(buildFrontendUrl("/settings", { discord: "connected" }, "settings-connections"));
  } catch (error) {
    res.clearCookie(stateCookieName, stateCookieBaseOptions());
    const message = error instanceof Error ? error.message : "Discord authorization failed.";
    return res.redirect(buildFrontendUrl("/settings", {
      discord_error: message,
    }, "settings-connections"));
  }
};

export const discordConnection = async (req, res, next) => {
  try {
    const connection = await getDiscordConnection(req.user.sub);
    return res.json({ configured: isDiscordConfigured(), connection });
  } catch (error) {
    return next(error);
  }
};

export const removeDiscordConnection = async (req, res, next) => {
  try {
    await disconnectDiscordAccount({ userId: req.user.sub, accountId: req.user.accountId });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
