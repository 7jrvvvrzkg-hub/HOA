import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto bg-primary-dark text-cream/80">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-cream">place holder (hoa name)</p>
            <p className="mt-2 text-sm">place holder (short tagline)</p>
          </div>
          <div>
            <p className="font-semibold text-cream">Quick Links</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="#mission">Mission</a></li>
              <li><a href="#announcements">Announcements</a></li>
              <li><Link href="/login">Resident Login</Link></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-cream">Contact</p>
            <p className="mt-2 text-sm">230 West Tazewell Street, Norfolk, VA</p>
            <p className="text-sm">place holder (phone)</p>
            <p className="text-sm">place holder (email)</p>
          </div>
        </div>
        <p className="mt-8 border-t border-cream/10 pt-6 text-xs text-cream/60">
          place holder (copyright line — © year, hoa name, all rights reserved)
        </p>
      </div>
    </footer>
  );
}
