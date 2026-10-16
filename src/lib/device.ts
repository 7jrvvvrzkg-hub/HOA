// Turns what a browser tells us about itself into something a person can read
// at a glance ("iPhone · Safari"), and reads the approximate place from the
// headers Vercel adds to every request. Neither is exact: the device is only
// what the browser claims, and the place is a guess from the network address
// (often the city of the internet provider, and wrong on a VPN or mobile data).

export type DeviceInfo = { device: string; os: string; browser: string };

export function parseUserAgent(ua: string | null | undefined): DeviceInfo {
  const s = (ua ?? "").slice(0, 400);
  if (!s) return { device: "Unknown device", os: "Unknown", browser: "Unknown browser" };

  let device = "Computer";
  let os = "Unknown";
  if (/iPhone/i.test(s)) { device = "iPhone"; os = "iOS"; }
  else if (/iPad/i.test(s)) { device = "iPad"; os = "iPadOS"; }
  else if (/Android/i.test(s)) {
    os = "Android";
    device = /Mobile/i.test(s) ? "Android phone" : "Android tablet";
  }
  else if (/Macintosh|Mac OS X/i.test(s)) { device = "Mac"; os = "macOS"; }
  else if (/Windows/i.test(s)) { device = "Windows PC"; os = "Windows"; }
  else if (/CrOS/i.test(s)) { device = "Chromebook"; os = "ChromeOS"; }
  else if (/Linux|X11/i.test(s)) { device = "Linux computer"; os = "Linux"; }

  let browser = "Browser";
  if (/Edg(e|A|iOS)?\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/SamsungBrowser/i.test(s)) browser = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(s)) browser = "Firefox";
  else if (/CriOS|Chrome\//i.test(s)) browser = "Chrome";
  else if (/Safari\//i.test(s)) browser = "Safari";
  else if (/HeadlessChrome/i.test(s)) browser = "Chrome";

  return { device, os, browser };
}

type Headers = Record<string, string | string[] | undefined> | undefined;

function header(h: Headers, name: string): string | null {
  const v = h?.[name];
  const one = Array.isArray(v) ? v[0] : v;
  return one ? one : null;
}

function decode(v: string | null) {
  if (!v) return null;
  try {
    return decodeURIComponent(v).slice(0, 100) || null;
  } catch {
    return v.slice(0, 100);
  }
}

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    return null;
  }
})();

export type Place = { city: string | null; region: string | null; country: string | null };

/** Approximate place of a request, from Vercel's headers (empty elsewhere,
 * including on a developer's own computer). */
export function placeFromHeaders(h: Headers): Place {
  const code = header(h, "x-vercel-ip-country");
  let country: string | null = null;
  if (code && /^[A-Za-z]{2}$/.test(code)) {
    try {
      country = regionNames?.of(code.toUpperCase()) ?? code.toUpperCase();
    } catch {
      country = code.toUpperCase();
    }
  }
  return {
    city: decode(header(h, "x-vercel-ip-city")),
    region: decode(header(h, "x-vercel-ip-country-region")),
    country,
  };
}

export function placeText(p: Place) {
  const bits = [p.city, p.region, p.country].filter(Boolean);
  // "Norfolk, VA, United States"
  return bits.length ? bits.join(", ") : "Location unknown";
}
