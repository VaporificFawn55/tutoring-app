"use client";

import { cx } from "@/components/ui/cx";
import type { RunnerStatus } from "@/lib/python/usePythonRunner";

export interface OutputPanelProps {
  stdout: string;
  stderr: string;
  status: RunnerStatus;
  className?: string;
}

const STATUS_LABEL: Record<RunnerStatus, string> = {
  idle: "Idle",
  loading: "Loading Python… (first time only)",
  ready: "Ready",
  running: "Running…",
  error: "Python failed to load",
};

export function OutputPanel({
  stdout,
  stderr,
  status,
  className,
}: OutputPanelProps) {
  const empty = !stdout && !stderr;

  return (
    <div
      className={cx(
        "overflow-hidden rounded-md border border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-canvas px-3 py-1.5 text-xs text-ink-muted">
        <span className="font-medium">Output</span>
        <span
          className={cx(
            status === "error" && "text-danger",
            status === "running" && "text-brand",
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-code-bg px-3 py-2 font-mono text-xs leading-relaxed text-code-fg">
        {empty ? (
          <span className="text-ink-subtle">
            {status === "running"
              ? "…"
              : "Run your code to see its output here."}
          </span>
        ) : (
          <>
            {stdout && <span>{stdout}</span>}
            {stderr && <span className="text-danger-soft">{stderr}</span>}
          </>
        )}
      </pre>
    </div>
  );
}
