import { sendEmail, securityNoticeTemplate } from "@/lib/email";

/** Email the account holder about a security change. Best effort: it never
 * throws, so a mail problem can't block (or undo) the security action. */
export async function notifySecurity(email: string, what: string) {
  try {
    await sendEmail({ to: email, subject: "Security notice for your Tazewell Place account", html: securityNoticeTemplate(what) });
  } catch (e) {
    console.error("[security-notice] couldn't send", e);
  }
}
