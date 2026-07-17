import fetch from "node-fetch";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

let transporter;

const getTransporter = () => {
  if (!env.smtp.host || !env.smtp.fromAddress) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.password } : undefined,
    });
  }
  return transporter;
};

export const sendOperationsEmail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();
  if (!transport) return { status: "skipped", reason: "SMTP is not configured." };
  if (!to) return { status: "skipped", reason: "The user has no email address." };

  try {
    const result = await transport.sendMail({
      from: { name: env.smtp.fromName, address: env.smtp.fromAddress },
      to,
      subject,
      text,
      html,
    });
    return { status: "sent", messageId: result.messageId };
  } catch (error) {
    return { status: "failed", reason: error.message };
  }
};

export const sendPushoverNotification = async ({ userKey, title, message, url, urlTitle }) => {
  if (!env.pushover.applicationToken) {
    return { status: "skipped", reason: "Pushover application token is not configured." };
  }
  if (!userKey) return { status: "skipped", reason: "The user has no Pushover key." };

  const body = new URLSearchParams({
    token: env.pushover.applicationToken,
    user: userKey,
    title: String(title ?? "LisTix").slice(0, 250),
    message: String(message ?? "").slice(0, 1024),
  });
  if (url) body.set("url", String(url).slice(0, 512));
  if (urlTitle) body.set("url_title", String(urlTitle).slice(0, 100));

  try {
    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.status !== 1) {
      return { status: "failed", reason: result.errors?.join(" ") || `Pushover returned ${response.status}.` };
    }
    return { status: "sent", request: result.request };
  } catch (error) {
    return { status: "failed", reason: error.message };
  }
};
