"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import clsx from "clsx";
import { setUserRoles } from "@/actions/users";
import type { RoleTag } from "@/db/schema";

const roleColor: Record<RoleTag, string> = {
  ADMIN: "bg-accent text-ink",
  OWNER: "bg-primary/10 text-primary",
  RENTER: "bg-info/10 text-info",
};

const roleLabel: Record<RoleTag, string> = {
  ADMIN: "Admin",
  OWNER: "Owner",
  RENTER: "Renter",
};

const allRoles: RoleTag[] = ["ADMIN", "OWNER", "RENTER"];

/** Admin-only control: role tags rendered as removable chips ("x" to
 * remove), plus an "add role" menu — a resident never sees this, only
 * admins looking at a profile do.
 *
 * `isSelf` locks the control entirely: nobody can edit their own role tags,
 * even an admin — that has to come from a different admin account. The
 * server enforces this too (setUserRoles rejects it outright), so this is
 * about a clear UI rather than the only line of defense. */
export default function RoleChips({
  userId,
  roles,
  isSelf = false,
}: {
  userId: string;
  roles: RoleTag[];
  isSelf?: boolean;
}) {
  const [current, setCurrent] = useState(roles);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(next: RoleTag[]) {
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      try {
        await setUserRoles(userId, next);
      } catch (e) {
        setCurrent(previous);
        setError(e instanceof Error ? e.message : "couldn't update roles");
      }
    });
  }

  function remove(role: RoleTag) {
    if (current.length === 1) return; // a profile needs at least one role
    apply(current.filter((r) => r !== role));
  }

  function add(role: RoleTag) {
    if (current.includes(role)) return;
    apply([...current, role]);
  }

  const addable = allRoles.filter((r) => !current.includes(r));

  if (isSelf) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {current.map((role) => (
          <span
            key={role}
            className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", roleColor[role])}
          >
            {roleLabel[role]}
          </span>
        ))}
        <span className="text-xs text-ink-soft/70">(you — ask another admin to change this)</span>
      </div>
    );
  }

  return (
    <div>
      <div className={clsx("flex flex-wrap items-center gap-1.5", pending && "opacity-60")}>
        {current.map((role) => (
          <span
            key={role}
            className={clsx("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", roleColor[role])}
          >
            {roleLabel[role]}
            <button
              type="button"
              onClick={() => remove(role)}
              className="rounded-full hover:bg-black/10"
              aria-label={`remove ${role} role`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {addable.length > 0 && (
          <select
            className="rounded-full border border-cream-dark bg-white px-2 py-1 text-xs text-ink-soft"
            value=""
            onChange={(e) => {
              if (e.target.value) add(e.target.value as RoleTag);
            }}
          >
            <option value="">+ role</option>
            {addable.map((r) => (
              <option key={r} value={r}>
                {roleLabel[r]}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
