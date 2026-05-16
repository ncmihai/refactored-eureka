"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { displayName, roleLabel, type AuthStatus } from "@/lib/auth";
import { fetchAuthStatus } from "@/lib/simulari";

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
    desc: "SIP, TER, Monte Carlo și CAGR net",
  },
  {
    href: "/tools/unit-linked",
    label: "Unit-Linked",
    desc: "Taxe alocare, unități inițiale și acumulare",
  },
  {
    href: "/tools/comparator",
    label: "Comparator 3-way",
    desc: "Depozit vs ETF vs Unit-Linked",
  },
];

const contentLinks = [
  {
    href: "/blog",
    label: "Blog educațional",
    desc: "Ghiduri RO despre credite, economii și investiții",
  },
  {
    href: "/demo",
    label: "Cere demo",
    desc: "Flow B2B cu simulări, share links și PDF white-label",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const anyActive = tools.some((t) => pathname?.startsWith(t.href));

  useEffect(() => {
    fetchAuthStatus().then(setAuth).catch(() => {
      setAuth({ authenticated: false, user: null });
    });
  }, [pathname]);

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

        <div className="flex items-center gap-2">
          {auth === null ? (
            <span
              className="hidden sm:inline-flex h-8 w-32 rounded-md bg-[var(--accent-soft)] animate-pulse"
              aria-label="Se verifică sesiunea"
            />
          ) : auth.authenticated && auth.user ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="max-w-[140px] truncate">
                  {displayName(auth.user)}
                </span>
                <span className="pill">{roleLabel(auth.user.role)}</span>
              </span>
            </>
          ) : (
            <Link href="/admin" className="btn-ghost text-sm">
              Intră
            </Link>
          )}
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Deschide meniul aplicației"
              className="btn-ghost h-9 w-9 p-0 grid place-items-center"
              data-active={anyActive || undefined}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M3 5h12M3 9h12M3 13h12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-[min(360px,calc(100vw-2rem))] card p-2 shadow-lg bg-[var(--background)]"
              >
                <div className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted-2)]">
                  Unelte
                </div>
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

                <div className="my-2 border-t border-[var(--border)]" />
                <div className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted-2)]">
                  Conținut
                </div>
                {contentLinks.map((link) => {
                  const active = pathname?.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
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
                        {link.label}
                      </div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug">
                        {link.desc}
                      </div>
                    </Link>
                  );
                })}

                <div className="my-2 border-t border-[var(--border)]" />
                <div className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-[var(--muted-2)]">
                  Workspace
                </div>
                {auth === null ? (
                  <div className="px-3 py-2.5 text-sm text-[var(--muted)]">
                    Se verifică sesiunea...
                  </div>
                ) : auth.authenticated && auth.user ? (
                  <>
                    <Link
                      href="/simulari"
                      role="menuitem"
                      className="block px-3 py-2.5 rounded-md hover:bg-[var(--accent-soft)]/50"
                    >
                      <div className="text-sm font-medium">Simulări salvate</div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">
                        Istoric, share links și exporturi PDF
                      </div>
                    </Link>
                    <Link
                      href="/admin"
                      role="menuitem"
                      className="block px-3 py-2.5 rounded-md hover:bg-[var(--accent-soft)]/50"
                    >
                      <div className="text-sm font-medium">Admin</div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">
                        {displayName(auth.user)} · {roleLabel(auth.user.role)}
                      </div>
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/admin"
                    role="menuitem"
                    className="block px-3 py-2.5 rounded-md hover:bg-[var(--accent-soft)]/50"
                  >
                    <div className="text-sm font-medium">Intră în admin</div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      Salvare, istoric și exporturi după login
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
