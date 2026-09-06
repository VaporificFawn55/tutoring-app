"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { getPythonRunner, type LoadStatus } from "./runner";
import type { RunResult } from "./protocol";

export type RunnerStatus = LoadStatus | "running";

export interface UsePythonRunner {
  status: RunnerStatus;
  stdout: string;
  stderr: string;
  lastResult: RunResult | null;
  running: boolean;
  /** Resolves with the result, or undefined if a run was already in progress. */
  run: (code: string, stdin?: string) => Promise<RunResult | undefined>;
  stop: () => void;
  /** Clear the captured output (not the code). */
  reset: () => void;
}

const serverStatus = (): LoadStatus => "idle";

export function usePythonRunner(): UsePythonRunner {
  const loadStatus = useSyncExternalStore(
    (onChange) => getPythonRunner().onStatusChange(onChange),
    () => getPythonRunner().getStatus(),
    serverStatus,
  );

  const [running, setRunning] = useState(false);
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const runningRef = useRef(false);

  const run = useCallback(async (code: string, stdin?: string) => {
    if (runningRef.current) return undefined;
    runningRef.current = true;
    setRunning(true);
    setStdout("");
    setStderr("");
    setLastResult(null);

    const result = await getPythonRunner().run(code, {
      stdin,
      onStdout: (chunk) => setStdout((prev) => prev + chunk),
      onStderr: (chunk) => setStderr((prev) => prev + chunk),
    });

    // The runner may append a trailing message (timeout / stop / load error)
    // that never streamed through onStderr — reconcile to the canonical text.
    setStdout(result.stdout);
    setStderr(result.stderr);
    setLastResult(result);
    runningRef.current = false;
    setRunning(false);
    return result;
  }, []);

  const stop = useCallback(() => {
    getPythonRunner().stop();
  }, []);

  const reset = useCallback(() => {
    setStdout("");
    setStderr("");
    setLastResult(null);
  }, []);

  return {
    status: running ? "running" : loadStatus,
    stdout,
    stderr,
    lastResult,
    running,
    run,
    stop,
    reset,
  };
}
