"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// One setting shared by the student and teacher views.
const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

// In-memory copy so the toggle still works when localStorage is unavailable
// (private windows, blocked site data).
let override: Theme | null = null;
const listeners = new Set<() => void>();

function readSaved(): Theme | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function getSnapshot(): Theme {
  return (
    override ??
    readSaved() ??
    (window.matchMedia(DARK_QUERY).matches ? "dark" : "light")
  );
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setStoredTheme(theme: Theme) {
  override = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Keep the in-memory choice only.
  }
  listeners.forEach((l) => l());
}

/**
 * The user's chosen theme: their saved choice, else the device setting.
 * Renders "light" on the server so hydration never mismatches.
 */
export function useStoredTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getSnapshot, (): Theme => "light");
  return [theme, setStoredTheme];
}

/** The theme of the surrounding view. Defaults to light outside a themed layout. */
export const ThemeContext = createContext<Theme>("light");

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
