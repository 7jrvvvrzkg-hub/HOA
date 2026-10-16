/**
 * Tazewell Place email automation.
 *
 * Sends through Resend's HTTP API directly (no SDK dependency needed).
 * If RESEND_API_KEY / EMAIL_FROM aren't set — e.g. on a first test deploy —
 * every function here logs what it *would* have sent and resolves quietly
 * instead of throwing, so the rest of the app keeps working without an
 * email account yet.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Tazewell Place <noreply@place-holder-domain.example>";

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendArgs) {
  if (!RESEND_API_KEY) {
    console.log("[email:no-op — set RESEND_API_KEY to actually send]", {
      to,
      subject,
    });
    return { ok: true, skipped: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[email:error]", res.status, body);
    return { ok: false, skipped: false };
  }
  return { ok: true, skipped: false };
}

/** The site's public address, for links and the logo inside emails. */
function siteUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

// Brand colors (same as the website).
const GREEN = "#2f5233";
const GREEN_DARK = "#223d26";
const GOLD = "#c9a227";
const CREAM = "#f7f5ef";
const CREAM_DARK = "#efe9d8";
const INK = "#22281f";
const INK_SOFT = "#4b5346";

/** A gold-on-green button that works in every email program (a plain link
 * styled as a button, with a table around it for Outlook). */
function button(href: string, label: string) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;"><tr>
    <td style="background:${GREEN};border-radius:6px;border-bottom:3px solid ${GOLD};">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:${CREAM};text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

function wrapper(title: string, bodyHtml: string, preheader = "") {
  const logo = `${siteUrl()}/images/email-logo.png`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CREAM};">${escapeHtml(preheader || title)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${CREAM};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${CREAM_DARK};border-radius:10px;overflow:hidden;">
        <tr><td align="center" style="background:${GREEN};padding:26px 24px 20px;border-bottom:4px solid ${GOLD};">
          <img src="${escapeHtml(logo)}" alt="Tazewell Place" height="60" style="display:block;margin:0 auto 12px;height:60px;width:auto;border:0;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;letter-spacing:5px;text-transform:uppercase;color:${CREAM};font-weight:bold;">Tazewell Place</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${GOLD};margin-top:6px;">Condominium Association</div>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${INK};">
          <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:${GREEN};">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 28px 26px;">
          <div style="border-top:1px solid ${CREAM_DARK};padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${INK_SOFT};text-align:center;">
            Tazewell Place Condominium Association<br>230 West Tazewell Street, Norfolk, VA<br>
            <a href="${escapeHtml(siteUrl())}" style="color:${GREEN};">${escapeHtml(siteUrl().replace(/^https?:\/\//, ""))}</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Sent to a resident right after they submit the contact form. */
export function contactAcknowledgementTemplate(name: string) {
  return wrapper(
    "We received your message",
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Thank you for reaching out to Tazewell Place. Your message came through and someone from the community will get back to you soon.</p>
     <p style="color:${INK_SOFT};font-size:13px;">If your question is urgent, please contact the office directly.</p>`,
    "Thanks for reaching out. We'll be in touch soon."
  );
}

/** Sent to admins and directors when a new contact-form / help request lead comes in. */
export function adminLeadAlertTemplate(name: string, email: string, message: string) {
  return wrapper(
    "New help request",
    `<p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
     <p><strong>Message:</strong></p>
     <p style="background:${CREAM};border-left:4px solid ${GOLD};padding:12px 14px;white-space:pre-line;">${escapeHtml(message)}</p>
     ${button(`${siteUrl()}/portal/admin/leads`, "Open it in the admin console")}`,
    `New help request from ${name}`
  );
}

/** Community-wide announcement email, one per recipient so it can be personalized later. */
export function announcementEmailTemplate(title: string, body: string) {
  return wrapper(
    title,
    `<p style="white-space:pre-line;">${escapeHtml(body)}</p>
     ${button(`${siteUrl()}/portal/announcements`, "Read it on the announcements board")}`,
    "A new announcement from Tazewell Place"
  );
}

/** Event reminder template. */
export function eventReminderTemplate(eventName: string, whenText: string) {
  return wrapper(
    `Reminder: ${eventName}`,
    `<p>${escapeHtml(eventName)} is coming up on <strong>${escapeHtml(whenText)}</strong>.</p>`,
    `${eventName} is coming up`
  );
}

/** Document-update notice — e.g. "bylaws were updated" — sent to affected residents only. */
export function documentUpdateTemplate(docTitle: string) {
  return wrapper(
    "A document was updated",
    `<p>&ldquo;${escapeHtml(docTitle)}&rdquo; was just updated in the document repository.</p>
     ${button(`${siteUrl()}/portal/documents`, "Open the documents page")}`,
    `${docTitle} was updated`
  );
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Sent to the board when a resident submits a form. */
export function formSubmittedTemplate(formTitle: string, residentName: string) {
  return wrapper(
    "New form submission",
    `<p>${escapeHtml(residentName)} submitted &ldquo;${escapeHtml(formTitle)}&rdquo;.</p>
     ${button(`${siteUrl()}/portal/admin/forms`, "Read it in the Forms tab")}`,
    `${residentName} submitted ${formTitle}`
  );
}

/** Follow-up when a resident undoes a submission right after sending it. */
export function formWithdrawnTemplate(formTitle: string, residentName: string) {
  return wrapper(
    "Form submission withdrawn",
    `<p>${escapeHtml(residentName)} undid their submission of &ldquo;${escapeHtml(formTitle)}&rdquo;. It has been removed from the inbox.</p>`,
    `${residentName} withdrew ${formTitle}`
  );
}

/** Password reset link. Valid for one hour, one use. */
export function passwordResetTemplate(link: string) {
  return wrapper(
    "Reset your password",
    `<p>Someone asked to reset the password for this account. If that was you, use the button below within one hour.</p>
     ${button(link, "Choose a new password")}
     <p style="font-size:13px;color:${INK_SOFT};">If the button doesn't work, copy this address into your browser:<br><span style="word-break:break-all;">${escapeHtml(link)}</span></p>
     <p style="font-size:13px;color:${INK_SOFT};">If you didn't ask for this, you can ignore this message. Your password won't change.</p>`,
    "Use this link within one hour to choose a new password"
  );
}

/** Sent after a password has been changed with a reset link. */
export function passwordChangedTemplate() {
  return wrapper(
    "Your password was changed",
    `<p>The password for your Tazewell Place account was just changed. If that was you, there's nothing more to do.</p>
     <p><strong>If it wasn't you,</strong> contact the office right away.</p>`,
    "The password for your account was just changed"
  );
}

/** Heads-up about a change to how an account is protected (two-step login
 * turned on/off, a backup code used, password changed by someone else). */
export function securityNoticeTemplate(what: string) {
  return wrapper(
    "Account security notice",
    `<p>${escapeHtml(what)}</p>
     <p>If this was you, there is nothing more to do. If it wasn't, contact the office right away and change your password.</p>`,
    what
  );
}
