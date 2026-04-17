"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/tools/credit", label: "Credit" },
  { href: "/tools/optimizare", label: "Optimizare" },
  { href: "/tools/depozit", label: "Depozit" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-6 h-6 rounded-md bg-[var(--foreground)] text-white grid place-items-center text-[10px] font-semibold tracking-wider">
            FP
          </span>
          <span className="text-sm font-medium tracking-tight group-hover:text-[var(--accent)] transition-colors">
            Finance Platform
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              data-active={pathname?.startsWith(l.href) || undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/admin" className="btn-ghost text-sm">
          Admin
        </Link>
      </div>
    </header>
  );
}
