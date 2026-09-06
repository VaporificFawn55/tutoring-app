import { cx } from "./cx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "border border-border bg-surface text-ink hover:bg-canvas",
  ghost: "text-ink-muted hover:bg-canvas",
  danger: "bg-danger text-white hover:opacity-90",
  success: "bg-success text-white hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the button and shows `loadingLabel` in place of the children. */
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Saving…",
  type,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
