"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/Button";
import {
  changeOwnPassword,
  startTwoStepSetup,
  confirmTwoStepSetup,
  disableTwoStep,
  regenerateRecoveryCodes,
  endCurrentSession,
} from "@/actions/security";

const input =
  "mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-cream-dark bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      <div className="mt-3 space-y-4 text-sm text-ink-soft">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export function ChangePasswordPanel({ forced }: { forced: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await changeOwnPassword(current, next, again);
      if (r.ok) {
        // Every session from before the change, including this one, is now
        // signed out — send them to sign in with the new password.
        await signOut({ callbackUrl: "/login?changed=1" });
      } else setError(r.error);
    });
  }

  return (
    <Card title={forced ? "Choose your own password" : "Change password"}>
      {forced && (
        <p>
          Your account was set up with a temporary password that someone else knows. Choose your own now. You&apos;ll
          sign in again afterwards.
        </p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block font-medium text-ink" htmlFor="cur">{forced ? "Temporary password" : "Current password"}</label>
          <input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={input} />
        </div>
        <div>
          <label className="block font-medium text-ink" htmlFor="new">New password</label>
          <input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={12} maxLength={72} autoComplete="new-password" className={input} />
          <p className="mt-1 text-xs">At least 12 characters. A few random words strung together works well.</p>
        </div>
        <div>
          <label className="block font-medium text-ink" htmlFor="again">Type it again</label>
          <input id="again" type="password" value={again} onChange={(e) => setAgain(e.target.value)} required minLength={12} maxLength={72} autoComplete="new-password" className={input} />
        </div>
        {error && <p className="text-danger" role="alert">{error}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save new password"}</Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-3">
      <p className="font-medium text-ink">Your backup codes</p>
      <p>
        If you lose your phone, each of these works <strong>once</strong> in place of the 6-digit code. Save them
        somewhere safe (a password manager, or printed and locked away). They won&apos;t be shown again.
      </p>
      <ul className="font-plain grid grid-cols-2 gap-2 rounded-md bg-cream p-4 text-base tracking-wider text-ink" data-recovery-codes>
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> I&apos;ve saved these codes
      </label>
      <Button type="button" disabled={!saved} onClick={onDone}>Continue</Button>
    </div>
  );
}

export function TwoStepSetupPanel({ required }: { required: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function begin() {
    setError(null);
    start(async () => {
      const r = await startTwoStepSetup();
      if (r.ok) setSetup({ secret: r.secret, qr: r.qr });
      else setError(r.error);
    });
  }
  function confirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await confirmTwoStepSetup(code);
      if (r.ok) setCodes(r.recoveryCodes);
      else setError(r.error);
    });
  }

  if (codes) {
    return (
      <Card title="Two-step login is on">
        <RecoveryCodes codes={codes} onDone={() => window.location.assign("/portal")} />
      </Card>
    );
  }

  return (
    <Card title={required ? "Turn on two-step login (required)" : "Turn on two-step login"}>
      <p>
        {required
          ? "Your role handles private legal documents, so signing in needs a 6-digit code from your phone in addition to your password. "
          : "Add a 6-digit code from your phone to your password, so a stolen password alone can't open your account. "}
        It takes about two minutes.
      </p>
      {!setup ? (
        <>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy, 1Password…).</li>
            <li>Press the button below, then scan the picture with the app.</li>
            <li>Type the 6-digit code the app shows.</li>
          </ol>
          {error && <p className="text-danger" role="alert">{error}</p>}
          <Button type="button" onClick={begin} disabled={pending}>{pending ? "One moment..." : "Start setup"}</Button>
        </>
      ) : (
        <form onSubmit={confirm} className="space-y-3">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt="QR code to scan with your authenticator app" width={176} height={176} className="rounded-md border border-cream-dark" />
            <div className="min-w-0">
              <p>Can&apos;t scan? Type this key into the app instead:</p>
              <p className="font-plain mt-1 break-all rounded-md bg-cream px-3 py-2 text-base tracking-wider text-ink" data-totp-secret>{setup.secret}</p>
            </div>
          </div>
          <div>
            <label className="block font-medium text-ink" htmlFor="code">6-digit code from the app</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={7} className={`${input} font-plain max-w-[10rem] tracking-widest`} />
          </div>
          {error && <p className="text-danger" role="alert">{error}</p>}
          <Button type="submit" disabled={pending}>{pending ? "Checking..." : "Turn on"}</Button>
        </form>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------

export function TwoStepManagePanel({ canTurnOff, backupLeft }: { canTurnOff: boolean; backupLeft: number }) {
  const [mode, setMode] = useState<null | "off" | "codes">(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      if (mode === "off") {
        const r = await disableTwoStep(password, code);
        if (r.ok) window.location.reload();
        else setError(r.error);
      } else {
        const r = await regenerateRecoveryCodes(password, code);
        if (r.ok) setCodes(r.recoveryCodes);
        else setError(r.error);
      }
    });
  }

  if (codes) {
    return (
      <Card title="New backup codes">
        <RecoveryCodes codes={codes} onDone={() => window.location.reload()} />
      </Card>
    );
  }

  return (
    <Card title="Two-step login is on">
      <p>
        Signing in needs your password plus a 6-digit code from your phone. You have <strong>{backupLeft}</strong> unused
        backup code{backupLeft === 1 ? "" : "s"}.
      </p>
      {mode === null ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMode("codes")}>Get new backup codes</Button>
          {canTurnOff && <Button type="button" variant="outline" size="sm" onClick={() => setMode("off")}>Turn off</Button>}
        </div>
      ) : (
        <form onSubmit={run} className="space-y-3">
          <p className="text-ink">{mode === "off" ? "Confirm to turn two-step login off." : "Confirm to replace your backup codes."}</p>
          <div>
            <label className="block font-medium text-ink" htmlFor="mp">Your password</label>
            <input id="mp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={input} />
          </div>
          <div>
            <label className="block font-medium text-ink" htmlFor="mc">Current 6-digit code (or a backup code)</label>
            <input id="mc" value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="one-time-code" className={`${input} font-plain max-w-[14rem] tracking-widest`} />
          </div>
          {error && <p className="text-danger" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant={mode === "off" ? "danger" : "primary"} disabled={pending}>{pending ? "Checking..." : "Confirm"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setMode(null); setError(null); }}>Cancel</Button>
          </div>
        </form>
      )}
    </Card>
  );
}

export function SignOutLink() {
  return (
    <button type="button" onClick={async () => { await endCurrentSession().catch(() => {}); await signOut({ callbackUrl: "/login" }); }} className="text-sm text-primary hover:underline">
      Sign out
    </button>
  );
}
