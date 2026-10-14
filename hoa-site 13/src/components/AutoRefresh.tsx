"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Quietly re-fetches the page's server data once a minute and when the tab
 * comes back into focus, so the red dots stay current without a manual
 * reload. Anything typed on the page is left alone. */
export default function AutoRefresh({ everyMs = 60_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refresh, everyMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, everyMs]);
  return null;
}
