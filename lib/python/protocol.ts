/**
 * Message protocol between the main thread (lib/python/runner.ts) and the
 * Pyodide worker (public/pyodide.worker.js). The worker is plain JS outside
 * TypeScript, so this file is the contract it mirrors by hand.
 */

export const PYODIDE_VERSION = "314.0.6";

export type WorkerLoadStatus = "loading" | "ready" | "error";

/** main -> worker */
export interface RunRequest {
  type: "run";
  id: string;
  code: string;
  stdin?: string;
}

/** worker -> main */
export interface StatusMessage {
  type: "status";
  status: WorkerLoadStatus;
  error?: string;
}
export interface StdoutMessage {
  type: "stdout";
  id: string;
  text: string;
}
export interface StderrMessage {
  type: "stderr";
  id: string;
  text: string;
}
export interface DoneMessage {
  type: "done";
  id: string;
  ok: boolean;
  error?: string;
}

export type WorkerMessage =
  | StatusMessage
  | StdoutMessage
  | StderrMessage
  | DoneMessage;

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  /** Present when the run failed: short error tag or Python message. */
  error?: string;
  /** The 10s watchdog fired and the worker was terminated. */
  timedOut?: boolean;
  /** The user pressed Stop. */
  stopped?: boolean;
  durationMs: number;
}
