import { cx } from "./cx";

export type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "px-4 py-3",
  md: "px-5 py-4",
  lg: "px-6 py-5",
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  padding?: CardPadding;
  /** Adds hover affordance for clickable list rows / links. */
  interactive?: boolean;
  /** Render as a different element (e.g. "li" inside a list). */
  as?: React.ElementType;
}

export function Card({
  padding = "md",
  interactive = false,
  as: Tag = "div",
  className,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cx(
        "rounded-card border border-border bg-surface",
        PADDING[padding],
        interactive &&
          "transition-shadow hover:border-brand hover:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
