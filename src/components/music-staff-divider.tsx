"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

// The Iongaf-style divider, rebuilt around the owner's own assets: a
// vertical staff line (rotated so it reads top-to-bottom, the way a
// horizontal music staff would look turned on its side), a treble clef
// pinned at the top — also rotated 90° — that doubles as the play/pause
// button, and a single note graphic that repeats down the line in a
// continuously looping "carousel" while a real track plays.
//
// Blank by default: no notes, nothing moving, just the staff line and a
// clef that gives a small periodic "shimmy" to hint it's clickable. Click
// it — notes start looping down the line and the track plays on repeat
// until it's clicked again or the page reloads. Click again to stop.
//
// Note timing is an approximation, not a real beat-match — matching notes
// to a track exactly needs audio analysis this app doesn't do. If you send
// timestamps/cue points for the track, those can drive this precisely.
const NOTES = [
  { left: 28, duration: 5.6, delay: -1.2 },
  { left: 62, duration: 6.4, delay: -3.8 },
  { left: 42, duration: 5.2, delay: -0.2 },
  { left: 70, duration: 6.0, delay: -4.6 },
  { left: 34, duration: 5.8, delay: -2.6 },
];

export function MusicStaffDivider({ className = "" }: { className?: string }) {
  const [playing, setPlaying] = useState(false);
  const [hovering, setHovering] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  function toggle() {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio("/music/track.mp3");
      audioRef.current.loop = true;
    }
    audioRef.current.play().catch(() => {
      // Autoplay-with-sound can be blocked before any user gesture has
      // landed elsewhere on the page — the click that got us here counts,
      // so this mainly guards odd browser edge cases.
    });
    setPlaying(true);
  }

  return (
    <div
      className={`relative flex h-full min-h-[320px] w-20 flex-col items-center ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Pause background music" : "Play background music"}
        className="relative z-10 mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none transition hover:scale-105 active:scale-95"
      >
        <Image
          src="/music/clef.png"
          alt=""
          width={80}
          height={80}
          className={`h-11 w-11 object-contain drop-shadow-md ${!playing ? "animate-[clef-shimmy_4s_ease-in-out_infinite]" : "rotate-90"}`}
        />
      </button>

      {hovering && (
        <span className="absolute left-full top-10 z-20 ml-3 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-cream shadow-soft">
          {playing ? "Playing — click to pause" : "Click for a little ambience"}
        </span>
      )}

      {/* The staff line — five hairlines rotated 90° so they run the length
          of the divider instead of side to side, like a music staff turned
          on its side. */}
      <div className="relative w-full flex-1 overflow-hidden">
        <div className="absolute inset-0 flex justify-center gap-[3px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="h-full w-px bg-gold/50" />
          ))}
        </div>

        {playing &&
          NOTES.map((note, i) => (
            <span
              key={i}
              className="absolute h-7 w-7"
              style={{
                left: `${note.left}%`,
                animation: `note-carousel ${note.duration}s linear ${note.delay}s infinite`,
              }}
            >
              <Image
                src="/music/note.png"
                alt=""
                width={60}
                height={76}
                className="h-full w-full rotate-90 object-contain drop-shadow"
              />
            </span>
          ))}
      </div>
    </div>
  );
}
