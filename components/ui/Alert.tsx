import { cx } from "./cx";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONES: Record<AlertTone, string> = {
  info: "border-brand bg-brand-soft text-brand",
  success: "border-success bg-success-soft text-success",
  warning: "border-warning bg-warning-soft text-warning",
  danger: "border-danger bg-danger-soft text-danger",
};

export interface AlertProps extends React.ComponentProps<"div"> {
  tone?: AlertTone;
  title?: string;
}

export function Alert({
  tone = "info",
  title,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      className={cx(
        "rounded-md border px-3 py-2 text-sm",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={cx(title && "mt-0.5")}>{children}</div>}
    </div>
  );
}
