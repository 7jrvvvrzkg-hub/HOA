export function BarList({
  items,
  color = "var(--color-pop)",
  emptyLabel,
}: {
  items: { label: string; value: number }[];
  color?: string;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-ink-soft">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate pr-2">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink-soft">{item.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-cream-soft">
            <div
              className="h-full rounded-full"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
