import { cx } from "./cx";
import { controlClass } from "./Input";

export function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select className={cx(controlClass, className)} {...props}>
      {children}
    </select>
  );
}
