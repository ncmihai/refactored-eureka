"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasBetaAccess, type AuthStatus } from "@/lib/auth";
import { fetchAuthStatus } from "@/lib/simulari";

const tools = [
  {
    href: "/tools/credit",
    title: "Simulator Credit",
    desc: "Vezi rata lunară, dobânda totală, comisioanele și ce se întâmplă dacă rambursezi anticipat.",
    tag: "Credit",
  },
  {
    href: "/tools/optimizare",
    title: "Optimizare Credit",
    desc: "Compară rambursarea anticipată cu păstrarea banilor pentru alte obiective.",
    tag: "Decizie",
  },
  {
    href: "/tools/depozit",
    title: "Depozit Bancar",
    desc: "Calculează dobânda netă, impozitul și efectul capitalizării pe o sumă concretă.",
    tag: "Economii",
  },
  {
    href: "/tools/investitii",
    title: "Investiții",
    desc: "Testează contribuții lunare, costuri și scenarii pentru ETF sau Unit-Linked.",
    tag: "Investiții",
  },
  {
    href: "/tools/comparator",
    title: "Comparator 3-way",
    desc: "Compară depozit, ETF și Unit-Linked pe același cash-flow.",
    tag: "Cont",
    accountOnly: true,
  },
];

export function HomeToolsGrid() {
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  useEffect(() => {
    fetchAuthStatus()
      .then(setAuth)
      .catch(() => setAuth({ authenticated: false, user: null }));
  }, []);

  const accountReady =
    auth?.authenticated && auth.user ? hasBetaAccess(auth.user) : false;
  const visibleTools = tools.filter((tool) => !tool.accountOnly || accountReady);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {visibleTools.map((tool, i) => (
        <Link
          key={tool.href}
          href={tool.href}
          className={`card card-hover p-6 group block reveal reveal-${i + 2}`}
        >
          <div className="flex items-center justify-between mb-6">
            <span className="pill bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/20">
              {tool.tag}
            </span>
            <span className="text-[var(--accent)] transition-colors text-lg">
              →
            </span>
          </div>
          <h3 className="font-serif text-2xl tracking-tight">{tool.title}</h3>
          <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
            {tool.desc}
          </p>
        </Link>
      ))}
    </div>
  );
}
