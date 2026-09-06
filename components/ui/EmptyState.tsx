import { cx } from "./cx";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
