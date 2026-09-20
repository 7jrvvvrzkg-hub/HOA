"use client";

// Category share donut for the analytics page. Each category always maps to
// the same color regardless of its rank that day (color follows the
// entity, never its position in the sort) — picked from a CVD-validated
// eight-hue categorical set, one hue per Embellish category.
const CATEGORY_COLOR: Record<string, string> = {
  Barware: "#2a78d6",
  Lighting: "#eb6834",
  "Decorative Accessories": "#1baf7a",
  "Case Goods": "#eda100",
  Seating: "#e87ba4",
  Garden: "#008300",
  Fireplace: "#4a3aa7",
  Mirrors: "#e34948",
};
const FALLBACK_COLOR = "#898781";

export function CategoryDonut({ items }: { items: { category: string; views: number }[] }) {
  const data = items.filter((i) => i.views > 0);
  const total = data.reduce((sum, i) => sum + i.views, 0);

  if (!data.length) {
    return (
      <p className="text-sm text-ink-soft">
        No category views logged yet — this fills in once people start browsing.
      </p>
    );
  }

  let cursor = 0;
  const stops: string[] = [];
  const segments = data.map((item) => {
    const color = CATEGORY_COLOR[item.category] ?? FALLBACK_COLOR;
    const start = (cursor / total) * 100;
    cursor += item.views;
    const end = (cursor / total) * 100;
    stops.push(`${color} ${start}% ${end}%`);
    return { ...item, color, pct: ((item.views / total) * 100).toFixed(0) };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div
        className="relative h-40 w-40 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        role="img"
        aria-label={`Category views: ${segments.map((s) => `${s.category} ${s.pct}%`).join(", ")}`}
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-cloud text-center shadow-soft">
          <span className="text-xl font-semibold tabular-nums">{total}</span>
          <span className="text-[0.6rem] uppercase tracking-widest text-ink-soft">Category views</span>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-2">
        {segments.map((s) => (
          <li key={s.category} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="flex-1 truncate">{s.category}</span>
            <span className="shrink-0 tabular-nums text-ink-soft">
              {s.views} · {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
