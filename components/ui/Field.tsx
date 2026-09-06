import { cx } from "./cx";

export interface FieldProps {
  label?: string;
  hint?: string;
  /** When set, replaces the hint and is styled as an error. */
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cx("space-y-1", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-ink"
        >
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
