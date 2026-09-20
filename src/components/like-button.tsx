"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { getLikedIds, toggleLikedId } from "@/lib/liked-ids";
import { getVisitorId } from "@/lib/visitor-id";

export function LikeButton({
  productId,
  initialCount,
  size = "md",
}: {
  productId: string;
  initialCount: number;
  size?: "sm" | "md";
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setLiked(getLikedIds().has(productId));
  }, [productId]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowLiked = toggleLikedId(productId);
    setLiked(nowLiked);
    setCount((c) => Math.max(0, c + (nowLiked ? 1 : -1)));

    try {
      await fetch("/api/likes/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, visitorId: getVisitorId(), liked: nowLiked }),
      });
    } catch {
      // Optimistic UI already updated; a failed sync just means the count
      // reconciles next time the page loads from the server.
    }
  }

  const dim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this piece" : "Like this piece"}
      className="inline-flex items-center gap-1.5 rounded-full bg-cloud/90 px-2.5 py-1.5 text-ink shadow-soft backdrop-blur transition hover:scale-105 active:scale-95"
    >
      <Heart
        className={`${dim} transition-colors ${liked ? "fill-pop text-pop" : "text-ink-soft"}`}
        strokeWidth={2}
      />
      {count > 0 && <span className="text-xs font-medium tabular-nums">{count}</span>}
    </button>
  );
}
