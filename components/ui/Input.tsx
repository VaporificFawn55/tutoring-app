import { cx } from "./cx";

/** Shared control styling for Input, Select, and Textarea. */
export const controlClass =
  "block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink shadow-sm " +
  "placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand " +
  "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-muted";

export function Input({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return <input className={cx(controlClass, className)} {...props} />;
}
