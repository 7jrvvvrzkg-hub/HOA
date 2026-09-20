import { User, DoorOpen } from "lucide-react";

const PERSON_HEIGHT_IN = 66; // ~5'6", a deliberately average reference
const DOOR_HEIGHT_IN = 80;

/**
 * Unique-to-this-shop idea: furniture dimensions in raw inches are hard to
 * picture. This lays the piece's height next to a person and a standard
 * door so buyers get an instant, gut-level sense of scale instead of doing
 * mental math from "34W x 22D x 30H".
 */
export function SizeReference({ dimensions }: { dimensions?: string }) {
  if (!dimensions) return null;

  const heightMatch = dimensions.match(/(\d+(?:\.\d+)?)\s*(?:"|in)?\s*H/i);
  if (!heightMatch) return null;

  const heightIn = parseFloat(heightMatch[1]);
  if (!heightIn || heightIn <= 0) return null;

  const maxIn = Math.max(heightIn, DOOR_HEIGHT_IN, PERSON_HEIGHT_IN);
  const scale = (v: number) => `${(v / maxIn) * 100}%`;

  return (
    <div className="rounded-2xl border border-line bg-cloud p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-ink-soft">
        Size at a glance
      </p>
      <div className="flex items-end justify-around gap-6" style={{ height: 140 }}>
        <div className="flex flex-col items-center justify-end gap-1.5">
          <div
            className="w-10 rounded-t-lg bg-pop"
            style={{ height: scale(heightIn) }}
            aria-hidden="true"
          />
          <span className="text-[0.65rem] font-semibold text-ink">This piece</span>
          <span className="text-[0.65rem] text-ink-soft">{heightIn}&quot;</span>
        </div>
        <div className="flex flex-col items-center justify-end gap-1.5 opacity-60">
          <User className="mb-1 h-5 w-5" style={{ marginBottom: `calc(${scale(PERSON_HEIGHT_IN)} - 1.25rem)` }} />
          <div className="w-8 rounded-t-lg bg-ink-soft" style={{ height: scale(PERSON_HEIGHT_IN) }} />
          <span className="text-[0.65rem] text-ink-soft">Avg. person</span>
        </div>
        <div className="flex flex-col items-center justify-end gap-1.5 opacity-60">
          <DoorOpen className="mb-1 h-5 w-5" style={{ marginBottom: `calc(${scale(DOOR_HEIGHT_IN)} - 1.25rem)` }} />
          <div className="w-8 rounded-t-lg bg-forest/60" style={{ height: scale(DOOR_HEIGHT_IN) }} />
          <span className="text-[0.65rem] text-ink-soft">Door</span>
        </div>
      </div>
    </div>
  );
}
