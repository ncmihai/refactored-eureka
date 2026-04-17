"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const tools = [
  {
    href: "/tools/credit",
    label: "Simulator Credit",
    desc: "Scadențar, revizuire dobândă, rambursare anticipată",
  },
  {
    href: "/tools/optimizare",
    label: "Optimizare Credit",
    desc: "Plată anticipată vs investiție paralelă",
  },
  {
    href: "/tools/depozit",
    label: "Depozit Bancar",
    desc: "Capitalizare lunară sau la scadență, impozit pe dobândă",
  },
  {
    href: "/tools/investitii",
    label: "Investiții ETF",
    desc: "SIP, TER, CAGR net după impozit",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const anyActive = tools.some((t) => pathname?.startsWith(t.href));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="nav-link inline-flex items-center gap-1.5"
              data-active={anyActive || undefined}
            >
              Tools
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path
                  d="M2 3.5 L5 6.5 L8 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-[320px] card p-2 shadow-lg bg-[var(--background)]"
              >
                {tools.map((t) => {
                  const active = pathname?.startsWith(t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      role="menuitem"
                      className={`block px-3 py-2.5 rounded-md transition-colors ${
                        active
                          ? "bg-[var(--accent-soft)]"
                          : "hover:bg-[var(--accent-soft)]/50"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          active
                            ? "text-[var(--accent)]"
                            : "text-[var(--foreground)]"
                        }`}
                      >
                        {t.label}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
                        {t.desc}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <Link href="/admin" className="btn-ghost text-sm">
          Admin
        </Link>
      </div>
    </header>
  );
}
