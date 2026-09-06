import { cx } from "./cx";

export interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({
  label = "Loading…",
  className,
}: LoadingStateProps) {
  return (
    <p className={cx("text-sm text-ink-muted", className)}>{label}</p>
  );
}
