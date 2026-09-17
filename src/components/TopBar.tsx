"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, FileText, LogIn, LogOut, Mail, LayoutDashboard } from "lucide-react";
import { ButtonLink, Button } from "@/components/Button";

const navItems = [
  { href: "#mission", label: "place holder (mission)" },
  { href: "#announcements", label: "place holder (announcements)" },
  { href: "#contact", label: "place holder (contact)" },
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
          <ButtonLink href="/portal/documents" variant="ghost" size="sm" className="text-cream hover:bg-primary-dark">
            <FileText size={16} /> document access
          </ButtonLink>
          <a href="#contact">
            <Button variant="ghost" size="sm" className="text-cream hover:bg-primary-dark">
              <Mail size={16} /> contact us
            </Button>
          </a>
          {session ? (
            <>
              <ButtonLink href="/portal" variant="outline" size="sm" className="border-cream text-cream hover:bg-cream hover:text-primary">
                <LayoutDashboard size={16} /> my portal
              </ButtonLink>
              <Button variant="accent" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut size={16} /> sign out
              </Button>
            </>
          ) : (
            <ButtonLink href="/login" variant="accent" size="sm">
              <LogIn size={16} /> login
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

      {open && (
        <div className="border-t border-cream/10 bg-primary px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-3 pt-3 text-sm font-medium">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
            <Link href="/portal/documents" onClick={() => setOpen(false)} className="flex items-center gap-2">
              <FileText size={16} /> document access
            </Link>
            {session ? (
              <>
                <Link href="/portal" onClick={() => setOpen(false)} className="flex items-center gap-2">
                  <LayoutDashboard size={16} /> my portal
                </Link>
                <button
                  className="flex items-center gap-2 text-left"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut size={16} /> sign out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <LogIn size={16} /> login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
