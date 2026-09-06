"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cx } from "./cx";

export interface NavLinkItem {
  href: string;
  label: string;
  /** Optional count chip (e.g. pending grading). Hidden when 0/undefined. */
  badge?: number;
}

export interface NavBarProps {
  brand: string;
  links?: NavLinkItem[];
}

export function NavBar({ brand, links = [] }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Highlight only the most specific matching link, so a section-root link
  // (e.g. "/student") doesn't stay lit on every nested page.
  const activeHref = links.reduce<string | null>((best, l) => {
    const matches = pathname === l.href || pathname.startsWith(l.href + "/");
    if (!matches) return best;
    return best && best.length >= l.href.length ? best : l.href;
  }, null);

  return (
    <nav className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-ink">{brand}</span>
        {links.length > 0 && (
          <div className="flex items-center gap-4">
            {links.map((l) => {
              const active = l.href === activeHref;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cx(
                    "inline-flex items-center gap-1.5 text-sm",
                    active
                      ? "font-medium text-ink"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {l.label}
                  {typeof l.badge === "number" && l.badge > 0 && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                      {l.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <button
        onClick={() =>
          signOut(auth).then(() => router.replace("/login"))
        }
        className="text-sm text-ink-muted hover:text-ink"
      >
        Sign out
      </button>
    </nav>
  );
}
