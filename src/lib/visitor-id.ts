// A lightweight anonymous visitor id, used only to let someone "like" a
// piece once and to attribute cart-abandonment reminders. Not used for
// tracking identity — just stored client-side so the like button and
// analytics counts behave sensibly across a browsing session.
const KEY = "embellish-visitor-id";

export function getVisitorId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}
