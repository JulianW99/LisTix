import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const signSessionToken = (payload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

export const verifySessionToken = (token) =>
  jwt.verify(token, env.jwtSecret);

export const signDiscordState = (payload) => jwt.sign(payload, env.jwtSecret, {
  expiresIn: "10m",
  audience: "discord-oauth",
  issuer: "listix",
});

export const verifyDiscordState = (token) => jwt.verify(token, env.jwtSecret, {
  audience: "discord-oauth",
  issuer: "listix",
});
