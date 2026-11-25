"use client";

import type { Theme } from "@/contexts/ThemeContext";

export interface ThemeToggleProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`Switch to ${next} mode`}
      className="text-sm text-ink-muted hover:text-ink"
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
