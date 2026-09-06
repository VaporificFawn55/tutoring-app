"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { getPythonRunner } from "@/lib/python/runner";
import { usePythonRunner } from "@/lib/python/usePythonRunner";
import type { RunResult } from "@/lib/python/protocol";
import { OutputPanel } from "./OutputPanel";
import { PythonEditor } from "./PythonEditor";

export interface CodeRunnerProps {
  initialCode?: string;
  /** Canned stdin. When `showStdin` is false this is fed to the run verbatim. */
  stdin?: string;
  readOnly?: boolean;
  /** Show the editable "Program input" box (default true). */
  showStdin?: boolean;
  onCodeChange?: (code: string) => void;
  onRun?: (result: RunResult) => void;
  /** Run once automatically on mount (e.g. a runnable lesson block). */
  autoRun?: boolean;
  className?: string;
}

export function CodeRunner({
  initialCode = "",
  stdin: stdinProp,
  readOnly = false,
  showStdin = true,
  onCodeChange,
  onRun,
  autoRun = false,
  className,
}: CodeRunnerProps) {
  // `initialCode` / `stdinProp` seed the state once. To reseed from the parent
  // (e.g. a different question), give the CodeRunner a `key`.
  const [code, setCode] = useState(initialCode);
  const [stdin, setStdin] = useState(stdinProp ?? "");
  const { status, stdout, stderr, running, run, stop, reset } =
    usePythonRunner();

  // Warm the worker as soon as a code surface mounts (never at module scope).
  useEffect(() => {
    getPythonRunner().preload();
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setCode(value);
      onCodeChange?.(value);
    },
    [onCodeChange],
  );

  const doRun = useCallback(async () => {
    const result = await run(code, showStdin ? stdin : stdinProp);
    if (result) onRun?.(result);
  }, [run, code, stdin, stdinProp, showStdin, onRun]);

  const didAutoRun = useRef(false);
  useEffect(() => {
    if (autoRun && !didAutoRun.current) {
      didAutoRun.current = true;
      void doRun();
    }
  }, [autoRun, doRun]);

  return (
    <div className={className}>
      <PythonEditor
        value={code}
        onChange={readOnly ? undefined : handleChange}
        readOnly={readOnly}
      />

      {showStdin && (
        <div className="mt-3">
          <Field
            label="Program input"
            hint="One line per input() call. Leave blank if the program doesn't read input."
          >
            <Textarea
              rows={2}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {running ? (
          <Button variant="danger" onClick={stop}>
            Stop
          </Button>
        ) : (
          <Button
            onClick={doRun}
            loading={status === "loading"}
            loadingLabel="Loading Python…"
          >
            Run
          </Button>
        )}
        <Button variant="ghost" onClick={reset} disabled={running}>
          Clear output
        </Button>
        {!readOnly && (
          <Button
            variant="ghost"
            onClick={() => handleChange(initialCode)}
            disabled={running || code === initialCode}
          >
            Reset code
          </Button>
        )}
      </div>

      <OutputPanel
        className="mt-3"
        stdout={stdout}
        stderr={stderr}
        status={status}
      />
    </div>
  );
}
