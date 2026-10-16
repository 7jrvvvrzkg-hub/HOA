"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { endCurrentSession } from "@/actions/security";

export default function SignOutButton() {
  return (
    <button
      onClick={async () => {
        // Ends this sign-in only; other devices stay signed in.
        await endCurrentSession().catch(() => {});
        await signOut({ callbackUrl: "/" });
      }}
      className="mt-2 flex items-center gap-2 text-cream/80 hover:text-accent"
    >
      <LogOut size={16} /> Sign Out
    </button>
  );
}
