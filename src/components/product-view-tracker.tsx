"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => {
    track({ eventType: "product_view", productId });
    // Intentionally fires once per mount, not per re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return null;
}
