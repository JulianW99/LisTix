import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { env } from "../config/env.js";
import { detectPassedDeliveryDeadlines, processRetransferEmail } from "./actionAutomationService.js";

let pollTimer;
let polling = false;

export const mailboxConfigured = () => Boolean(env.imap.host && env.imap.user && env.imap.password);

export const pollRetransferMailbox = async () => {
  if (!mailboxConfigured() || polling) return { skipped: true };
  polling = true;
  const client = new ImapFlow({
    host: env.imap.host, port: env.imap.port, secure: env.imap.secure,
    auth: { user: env.imap.user, pass: env.imap.password }, logger: false,
  });
  let processed = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(env.imap.mailbox);
    try {
      const unseen = await client.search({ seen: false });
      for (const uid of unseen.slice(-50)) {
        const message = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        if (!message?.source) continue;
        const parsed = await simpleParser(message.source);
        const htmlText = typeof parsed.html === "string"
          ? parsed.html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?\s*>|<\/(?:p|div|tr|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n")
          : "";
        const result = await processRetransferEmail({
          subject: parsed.subject || message.envelope?.subject || "",
          text: parsed.text || htmlText,
          messageId: parsed.messageId || `imap-${uid}`,
        });
        if (result.recognized) {
          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
          processed += 1;
        }
      }
    } finally {
      lock.release();
    }
    return { processed };
  } finally {
    await client.logout().catch(() => undefined);
    polling = false;
  }
};

export const startMailboxMonitor = () => {
  if (pollTimer) return false;
  const run = () => {
    if (mailboxConfigured()) void pollRetransferMailbox().catch((error) => console.error("Mailbox poll failed:", error.message));
    void detectPassedDeliveryDeadlines().catch((error) => console.error("Deadline monitor failed:", error.message));
  };
  void run();
  pollTimer = setInterval(run, env.imap.pollIntervalMs);
  pollTimer.unref?.();
  return true;
};

export const stopMailboxMonitor = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = undefined;
};
