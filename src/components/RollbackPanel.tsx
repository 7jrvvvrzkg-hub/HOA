"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, AlertTriangle } from "lucide-react";
import { Button } from "@/components/Button";
import { performRollback, previewRollback, type PreviewLine } from "@/actions/rollback";

/** Admin-only "Roll back" tool for the Activity log: pick a day and time, see
 * exactly what would change, then confirm by typing ROLL BACK. */
export default function RollbackPanel({ sinceText, todayIso }: { sinceText: string; todayIso: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ whenText: string; lines: PreviewLine[]; total: number } | null>(null);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState<{ whenText: string; lines: PreviewLine[] } | null>(null);

  function reset() {
    setPreview(null);
    setTyped("");
    setError(null);
  }

  function look() {
    reset();
    setDone(null);
    start(async () => {
      try {
        const r = await previewRollback(date, time);
        if (!r.ok) setError(r.error);
        else setPreview({ whenText: r.whenText, lines: r.lines, total: r.total });
      } catch {
        setError("Something went wrong. Nothing was changed.");
      }
    });
  }

  function go() {
    setError(null);
    start(async () => {
      try {
        const r = await performRollback(date, time, typed);
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setDone({ whenText: r.whenText, lines: r.lines });
        setPreview(null);
        setTyped("");
        router.refresh();
      } catch {
        setError("Something went wrong. Nothing was changed.");
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <History size={15} /> Roll back…
      </Button>
    );
  }

  const field = "font-plain h-11 w-full rounded-md border border-cream-dark bg-white px-3 text-base text-ink focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="w-full rounded-lg border border-danger/40 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" />
          <div>
            <h3 className="text-base font-semibold text-ink">Roll back the site</h3>
            <p className="font-plain mt-1 max-w-2xl text-sm text-ink-soft">
              Changes are remembered back to <strong>{sinceText}</strong>.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => { setOpen(false); reset(); setDone(null); }} className="font-plain shrink-0 text-sm text-ink-soft hover:underline">
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="font-plain block text-sm font-medium text-ink">
          Day
          <input type="date" value={date} max={todayIso} onChange={(e) => { setDate(e.target.value); reset(); }} className={`${field} mt-1`} />
        </label>
        <label className="font-plain block text-sm font-medium text-ink">
          Time
          <input type="time" value={time} onChange={(e) => { setTime(e.target.value); reset(); }} className={`${field} mt-1`} />
        </label>
        <Button type="button" variant="primary" disabled={pending || !date || !time} onClick={look}>
          {pending && !preview ? "Checking..." : "See what would change"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="font-plain mt-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {done && (
        <div role="status" className="font-plain mt-4 rounded-md bg-primary/10 px-3 py-3 text-sm text-primary">
          <p className="font-semibold">Done. The site is back to how it was on {done.whenText} (Eastern).</p>
          {done.lines.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {done.lines.map((l) => (
                <li key={l.label}>{l.label}: {l.restored} brought back, {l.removed} removed, {l.changed} changed</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {preview && (
        <div className="mt-4">
          <p className="font-plain text-sm font-semibold text-ink">As of {preview.whenText} (Eastern):</p>
          {preview.total === 0 ? (
            <p className="font-plain mt-1 text-sm text-ink-soft">Nothing has changed since then, so there&apos;s nothing to roll back.</p>
          ) : (
            <>
              <div className="mt-2 overflow-x-auto rounded-md border border-cream-dark">
                <table className="font-plain w-full text-left text-sm">
                  <thead className="bg-cream-dark/40 text-xs uppercase text-ink-soft">
                    <tr>
                      <th className="px-3 py-2">What</th>
                      <th className="px-3 py-2 text-right">Brought back</th>
                      <th className="px-3 py-2 text-right">Removed</th>
                      <th className="px-3 py-2 text-right">Changed back</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.lines.map((l) => (
                      <tr key={l.label} className="border-t border-cream-dark">
                        <td className="px-3 py-2 text-ink">{l.label}</td>
                        <td className="px-3 py-2 text-right">{l.restored}</td>
                        <td className="px-3 py-2 text-right">{l.removed}</td>
                        <td className="px-3 py-2 text-right">{l.changed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="font-plain mt-2 text-xs text-ink-soft">
                Anything added after that moment, including new accounts, will be removed.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="font-plain block text-sm font-medium text-ink">
                  Type ROLL BACK to confirm
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={`${field} mt-1`} placeholder="ROLL BACK" />
                </label>
                <Button type="button" variant="danger" disabled={pending || typed.trim().toUpperCase() !== "ROLL BACK"} onClick={go}>
                  {pending ? "Rolling back..." : "Roll back now"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
