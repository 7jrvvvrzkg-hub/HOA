"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, FileText, LogIn, LogOut, Mail, LayoutDashboard } from "lucide-react";
import clsx from "clsx";
import { ButtonLink, Button } from "@/components/Button";

// "Contact" used to be listed here too, as plain text, right next to the
// "Contact Us" button below — same destination (#contact), shown twice.
// The button is the one entry point now.
const navItems = [
  { href: "#mission", label: "Mission" },
  { href: "#announcements", label: "Announcements" },
];

export default function TopBar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-primary text-cream shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 text-sm">
            place holder (logo)
          </span>
          <span>place holder (hoa name)</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-accent transition-colors">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/portal/documents" variant="ghostInvert" size="sm">
            <FileText size={16} /> Document Access
          </ButtonLink>
          <a href="#contact">
            <Button variant="ghostInvert" size="sm">
              <Mail size={16} /> Contact Us
            </Button>
          </a>
          {session ? (
            <>
              <ButtonLink href="/portal" variant="outlineInvert" size="sm">
                <LayoutDashboard size={16} /> My Portal
              </ButtonLink>
              <Button variant="accent" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut size={16} /> Sign Out
              </Button>
            </>
          ) : (
            <ButtonLink href="/login" variant="accent" size="sm">
              <LogIn size={16} /> Login
            </ButtonLink>
          )}
        </div>

        <button
          className="md:hidden"
          aria-label={open ? "close menu" : "open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Always mounted (never conditionally rendered) so the open/close can
          actually animate — collapsing to 0fr rather than unmounting is what
          gives this a smooth "come down" instead of an instant snap. */}
      <div
        className={clsx(
          "grid overflow-hidden border-t border-cream/10 bg-primary px-4 transition-[grid-template-rows] duration-300 ease-in-out md:hidden",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <nav className="flex flex-col gap-3 overflow-hidden pb-4 pt-3 text-sm font-medium">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
              {item.label}
            </a>
          ))}
          <a href="#contact" onClick={() => setOpen(false)} className="flex items-center gap-2">
            <Mail size={16} /> Contact Us
          </a>
          <Link href="/portal/documents" onClick={() => setOpen(false)} className="flex items-center gap-2">
            <FileText size={16} /> Document Access
          </Link>
          {session ? (
            <>
              <Link href="/portal" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <LayoutDashboard size={16} /> My Portal
              </Link>
              <button
                className="flex items-center gap-2 text-left"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <LogIn size={16} /> Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
