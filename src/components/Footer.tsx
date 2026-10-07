import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto bg-primary-dark text-cream/80">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="font-semibold text-cream">place holder</p>
            <p className="mt-2 text-sm">tagline</p>
          </div>
          <div>
            <p className="font-semibold text-cream">Quick Links</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a href="#mission">Community</a></li>
              <li><a href="#announcements">Announcements</a></li>
              <li><Link href="/login">Resident Login</Link></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-cream">Contact</p>
            <p className="mt-2 text-sm">230 West Tazewell Street, Norfolk, VA</p>
            <p className="text-sm">phone number</p>
            <p className="text-sm">email</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 pt-6 text-xs text-cream/60">
          <p>copyright line © year</p>
          <p>
            Made by{" "}
            <a href="https://bownode.com" target="_blank" rel="noopener noreferrer" className="text-cream/80 hover:text-cream hover:underline">
              Bownode, LLC
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
