"use client";

import { useEffect, useRef } from "react";
import { cx } from "./cx";
import { controlClass } from "./Input";

export interface TextareaProps extends React.ComponentProps<"textarea"> {
  /**
   * Grows the textarea to fit its content so the whole value is visible
   * without an inner scrollbar. Absorbs the old AutoTextarea helper.
   */
  autoGrow?: boolean;
}

export function Textarea({
  autoGrow = false,
  className,
  value,
  ...props
}: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoGrow) return;
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoGrow, value]);

  return (
    <textarea
      ref={ref}
      value={value}
      className={cx(
        controlClass,
        autoGrow && "resize-none overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}
