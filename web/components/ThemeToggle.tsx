"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "finance-platform-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === "dark" ? "Activează tema deschisă" : "Activează tema neagră"}
      onClick={toggle}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__knob" />
      </span>
      <span className="hidden sm:inline">{theme === "dark" ? "Black" : "Light"}</span>
    </button>
  );
}

