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

