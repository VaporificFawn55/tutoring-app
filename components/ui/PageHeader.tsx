import Link from "next/link";
import { cx } from "./cx";

export interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  backHref,
  backLabel = "Back",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cx(
        "mb-6 flex items-center justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="shrink-0 text-sm text-ink-muted hover:text-ink"
          >
            ← {backLabel}
          </Link>
        )}
        <h1 className="truncate text-xl font-semibold text-ink">{title}</h1>
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
