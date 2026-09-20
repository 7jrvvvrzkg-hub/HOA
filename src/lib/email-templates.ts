// Email HTML has to be written the old way — table layout, inline styles —
// because Outlook, Gmail, and Apple Mail each support a different subset of
// modern CSS. Don't "improve" this with flexbox/grid; it will silently
// break in whichever client you didn't test.

import { formatPrice } from "@/lib/format";
import { signUnsubscribeToken } from "@/lib/unsubscribe-token";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.embellishantiques.com";

function shell(bodyHtml: string, email: string): string {
  const unsubscribeUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${signUnsubscribeToken(email)}`;

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f2e9d8;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2e9d8;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#faf5ec;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#2f4a3c;padding:24px 32px;text-align:center;">
                <span style="color:#faf5ec;font-size:22px;font-style:italic;">Embellish</span>
                <div style="color:#e8d3a0;font-size:10px;letter-spacing:3px;margin-top:2px;">ANTIQUES</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#241a12;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f2e9d8;text-align:center;">
                <p style="font-size:11px;color:#4a3c2f;margin:0 0 6px;">
                  Embellish Antiques · Durham, NC
                </p>
                <p style="font-size:11px;color:#4a3c2f;margin:0;">
                  <a href="${unsubscribeUrl}" style="color:#4a3c2f;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function productRow(item: { name: string; priceCents: number; image?: string; url: string }): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="88" style="vertical-align:top;">
          <a href="${item.url}">
            <img src="${item.image || `${SITE_URL}/email-placeholder.png`}" width="80" height="80" alt="${item.name}" style="border-radius:10px;object-fit:cover;background-color:#e8d3a0;" />
          </a>
        </td>
        <td style="vertical-align:top;padding-left:14px;">
          <a href="${item.url}" style="color:#241a12;font-size:15px;text-decoration:none;font-weight:bold;">${item.name}</a>
          <div style="color:#e2551f;font-size:14px;margin-top:4px;">
            ${item.priceCents > 0 ? formatPrice(item.priceCents) : "Price upon request"}
          </div>
        </td>
      </tr>
    </table>`;
}

export function abandonedCartEmail(
  email: string,
  items: { name: string; priceCents: number; image?: string; slug: string }[]
): { subject: string; html: string } {
  const rows = items
    .map((i) => productRow({ ...i, url: `${SITE_URL}/product/${i.slug}` }))
    .join("");

  const html = shell(
    `
    <h1 style="font-size:22px;margin:0 0 8px;font-style:italic;">You left something beautiful behind</h1>
    <p style="font-size:14px;color:#4a3c2f;margin:0 0 24px;">
      Your bag is still waiting — these pieces are one of a kind, so they might not be around long.
    </p>
    ${rows}
    <div style="text-align:center;margin-top:24px;">
      <a href="${SITE_URL}/cart" style="display:inline-block;background-color:#e2551f;color:#faf5ec;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:bold;">
        Return to your bag
      </a>
    </div>
    `,
    email
  );

  return { subject: "You left something in your bag", html };
}

export function newsletterEmail(
  email: string,
  subject: string,
  intro: string,
  items: { name: string; priceCents: number; image?: string; slug: string }[]
): string {
  const rows = items
    .map((i) => productRow({ ...i, url: `${SITE_URL}/product/${i.slug}` }))
    .join("");

  return shell(
    `
    <h1 style="font-size:22px;margin:0 0 8px;font-style:italic;">${subject}</h1>
    ${intro ? `<p style="font-size:14px;color:#4a3c2f;margin:0 0 24px;">${intro}</p>` : ""}
    ${rows}
    <div style="text-align:center;margin-top:24px;">
      <a href="${SITE_URL}/shop" style="display:inline-block;background-color:#2f4a3c;color:#faf5ec;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:14px;font-weight:bold;">
        Shop the full collection
      </a>
    </div>
    `,
    email
  );
}
