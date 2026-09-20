"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

const TYPE_SPEED_MS = 70;
const DELETE_SPEED_MS = 35;
const PAUSE_AFTER_TYPE_MS = 1400;
const PAUSE_AFTER_DELETE_MS = 300;

/**
 * The Depop-style search bar: when the field is empty, the placeholder
 * types out a real item name, sits for a beat, then backspaces itself and
 * moves on to the next one. Typing anything for real stops the animation
 * instantly and never fights the user's input.
 */
export function AnimatedSearchBar({
  words,
  className = "",
}: {
  words: string[];
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The typing/backspacing effect is rendered as a styled overlay, not the
  // native `placeholder` attribute — a real DOM span lets the caret be a
  // proper thin blinking bar (reusing the app's caret-blink keyframe)
  // instead of a monospace block character stuffed into placeholder text,
  // which rendered like an odd little floating shape on small screens.
  useEffect(() => {
    if (!words.length || focused || value) return;

    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const word = `Try “${words[wordIndex % words.length]}”`;

      if (!deleting) {
        charIndex++;
        setTyped(word.slice(0, charIndex));
        if (charIndex >= word.length) {
          deleting = true;
          timeoutRef.current = setTimeout(tick, PAUSE_AFTER_TYPE_MS);
          return;
        }
        timeoutRef.current = setTimeout(tick, TYPE_SPEED_MS);
      } else {
        charIndex--;
        setTyped(word.slice(0, charIndex));
        if (charIndex <= 0) {
          deleting = false;
          wordIndex++;
          timeoutRef.current = setTimeout(tick, PAUSE_AFTER_DELETE_MS);
          return;
        }
        timeoutRef.current = setTimeout(tick, DELETE_SPEED_MS);
      }
    };

    timeoutRef.current = setTimeout(tick, 500);
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [words, focused, value]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/shop?q=${encodeURIComponent(q)}`);
  }

  const showAnimation = !focused && !value;

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
        strokeWidth={2}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={showAnimation ? "" : "Search the shop…"}
        aria-label="Search the shop"
        className="w-full rounded-full border border-line bg-cloud py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/70 outline-none transition focus:border-pop focus:ring-2 focus:ring-pop/20"
      />
      {showAnimation && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-10 right-4 flex items-center overflow-hidden text-sm text-ink-soft/70"
        >
          <span className="truncate">{typed}</span>
          <span className="ml-px inline-block h-4 w-[1.5px] shrink-0 animate-[caret-blink_1s_step-end_infinite] bg-ink-soft/70" />
        </span>
      )}
    </form>
  );
}
