import { cx } from "./cx";

export type ContainerWidth = "narrow" | "default" | "wide" | "workspace";

const WIDTHS: Record<ContainerWidth, string> = {
  narrow: "max-w-xl", // forms
  default: "max-w-3xl", // lists
  wide: "max-w-4xl", // runner / grading / lessons
  workspace: "max-w-7xl",
};

export interface ContainerProps extends React.ComponentProps<"div"> {
  width?: ContainerWidth;
}

export function Container({
  width = "default",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cx("mx-auto w-full", WIDTHS[width], className)}
      {...props}
    />
  );
}
