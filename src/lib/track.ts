"use client";

// Fire-and-forget analytics beacon. Never blocks the UI and never throws —
// worst case, an event just doesn't get logged.
export function track(event: {
  eventType: "category_view" | "product_click" | "product_view";
  category?: string;
  productId?: string;
}) {
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
