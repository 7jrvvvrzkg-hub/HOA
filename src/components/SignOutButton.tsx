"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="mt-2 flex items-center gap-2 text-cream/80 hover:text-accent"
    >
      <LogOut size={16} /> Sign Out
    </button>
  );
}
