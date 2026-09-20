/**
 * place holder (hoa name) email automation.
 *
 * Sends through Resend's HTTP API directly (no SDK dependency needed).
 * If RESEND_API_KEY / EMAIL_FROM aren't set — e.g. on a first test deploy —
 * every function here logs what it *would* have sent and resolves quietly
 * instead of throwing, so the rest of the app keeps working without an
 * email account yet.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "place holder (sender name) <noreply@place-holder-domain.example>";

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

function wrapper(title: string, bodyHtml: string) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color:#1f2a24;">
    <div style="background:#2f5233; padding:20px 24px; border-radius:8px 8px 0 0;">
      <span style="color:#f4efe1; font-size:18px; font-weight:bold;">place holder (hoa name)</span>
    </div>
    <div style="border:1px solid #e5e1d6; border-top:none; padding:24px; border-radius:0 0 8px 8px;">
      <h2 style="margin-top:0; color:#2f5233;">${title}</h2>
      ${bodyHtml}
      <p style="margin-top:32px; font-size:12px; color:#7a7a70;">
        place holder (hoa name / mailing address / unsubscribe or preference-center link)
      </p>
    </div>
  </div>`;
}

/** Sent to a resident right after they submit the contact form. */
export function contactAcknowledgementTemplate(name: string) {
  return wrapper(
    "we received your message",
    `<p>hi ${escapeHtml(name)},</p>
     <p>place holder (acknowledgement copy — thanks for reaching out, someone from the community team will respond within place holder (response-time SLA)).</p>`
  );
}

/** Sent to admins when a new contact-form / help request lead comes in. */
export function adminLeadAlertTemplate(name: string, email: string, message: string) {
  return wrapper(
    "new help request",
    `<p><strong>from:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
     <p><strong>message:</strong><br/>${escapeHtml(message)}</p>
     <p>place holder (link to open this lead in the admin console)</p>`
  );
}

/** Community-wide announcement email, one per recipient so it can be personalized later. */
export function announcementEmailTemplate(title: string, body: string) {
  return wrapper(
    title,
    `<p>${escapeHtml(body)}</p>
     <p>place holder (link back to the announcements board)</p>`
  );
}

/** Event reminder template. */
export function eventReminderTemplate(eventName: string, whenText: string) {
  return wrapper(
    `reminder: ${eventName}`,
    `<p>place holder (reminder copy) — ${escapeHtml(eventName)} is coming up on ${escapeHtml(whenText)}.</p>`
  );
}

/** Document-update notice — e.g. "bylaws were updated" — sent to affected residents only. */
export function documentUpdateTemplate(docTitle: string) {
  return wrapper(
    "a document was updated",
    `<p>place holder (document-update copy) — "${escapeHtml(docTitle)}" was just updated in the document repository.</p>
     <p>place holder (link to the document repo)</p>`
  );
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
