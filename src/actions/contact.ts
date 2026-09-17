"use server";

import { arrayContains } from "drizzle-orm";
import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { contactFormSchema } from "@/lib/validation";
import { sendEmail, contactAcknowledgementTemplate, adminLeadAlertTemplate } from "@/lib/email";

export type ContactFormState = {
  ok: boolean;
  error?: string;
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const parsed = contactFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid submission" };
  }

  const { name, email, phone, message } = parsed.data;

  await db.insert(leads).values({ name, email, phone: phone || null, message });

  // fire-and-forget style, but we still await so we can no-op cleanly
  // without an API key configured yet.
  await sendEmail({
    to: email,
    subject: "place holder (acknowledgement subject line)",
    html: contactAcknowledgementTemplate(name),
  });

  const admins = await db
    .select({ email: users.email })
    .from(users)
    .where(arrayContains(users.roles, ["ADMIN"]));

  if (admins.length > 0) {
    await sendEmail({
      to: admins.map((a) => a.email),
      subject: "place holder (admin alert subject line)",
      html: adminLeadAlertTemplate(name, email, message),
    });
  }

  return { ok: true };
}

// keeping the lead id path implicit — admins manage leads from the admin console.
