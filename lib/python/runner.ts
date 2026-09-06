/**
 * Main-thread client for the Pyodide worker. One shared instance per session
 * (see getPythonRunner). Never construct a Worker at module scope — only inside
 * methods, so SSR / `next build` prerendering never touches it.
 *
 * Timeout / Stop model: `worker.terminate()` is the only reliable way to kill a
 * runaway program (SharedArrayBuffer-based interrupts need cross-origin
 * isolation, which this app deliberately does not enable). So a timeout or a
 * Stop press terminates the worker and the next run() cold-starts a fresh one
 * (~3-5s re-init; the wasm itself is HTTP-cached).
 */

import type {
  RunRequest,
  RunResult,
  WorkerMessage,
} from "./protocol";

const WORKER_URL = "/pyodide.worker.js";
const DEFAULT_TIMEOUT_MS = 10_000;

export type LoadStatus = "idle" | "loading" | "ready" | "error";

export interface RunOptions {
  stdin?: string;
  timeoutMs?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

interface ActiveRun {
  id: string;
  resolve: (r: RunResult) => void;
  stdout: string;
  stderr: string;
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

class PythonRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((err: Error) => void) | null = null;
  private status: LoadStatus = "idle";
  private active: ActiveRun | null = null;
  private listeners = new Set<(s: LoadStatus) => void>();

  getStatus(): LoadStatus {
    return this.status;
  }

  onStatusChange(fn: (s: LoadStatus) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(s: LoadStatus): void {
    this.status = s;
    for (const fn of this.listeners) fn(s);
  }

  /** Start worker construction + Pyodide load without waiting for it. */
  preload(): void {
    void this.ensureReady().catch(() => {
      /* surfaced via status === "error" */
    });
  }

  private ensureReady(): Promise<void> {
    if (this.worker && this.ready) return this.ready;

    this.emit("loading");
    this.ready = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });

    const worker = new Worker(WORKER_URL, { type: "module" });
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      this.onWorkerMessage(e.data);
    };
    worker.onerror = (e) => {
      this.failLoad(new Error(e.message || "The Python worker failed to start."));
    };
    this.worker = worker;
    return this.ready;
  }

  private failLoad(err: Error): void {
    this.emit("error");
    this.rejectReady?.(err);
    this.rejectReady = null;
    this.resolveReady = null;
    if (this.active) {
      clearTimeout(this.active.timer);
      this.finish({ ok: false, error: err.message, extraStderr: err.message });
    }
    this.killWorker();
  }

  private onWorkerMessage(msg: WorkerMessage): void {
    if (msg.type === "status") {
      if (msg.status === "ready") {
        this.emit("ready");
        this.resolveReady?.();
        this.resolveReady = null;
        this.rejectReady = null;
      } else if (msg.status === "error") {
        this.failLoad(new Error(msg.error || "Python failed to load."));
      } else {
        this.emit("loading");
      }
      return;
    }

    const run = this.active;
    if (!run || msg.id !== run.id) return;

    if (msg.type === "stdout") {
      run.stdout += msg.text;
      run.onStdout?.(msg.text);
    } else if (msg.type === "stderr") {
      run.stderr += msg.text;
      run.onStderr?.(msg.text);
    } else if (msg.type === "done") {
      clearTimeout(run.timer);
      this.finish({ ok: msg.ok, error: msg.error });
    }
  }

  /** Resolve the active run with accumulated output plus the given outcome. */
  private finish(outcome: {
    ok: boolean;
    error?: string;
    extraStderr?: string;
    timedOut?: boolean;
    stopped?: boolean;
  }): void {
    const run = this.active;
    if (!run) return;
    this.active = null;

    const stderr = outcome.extraStderr
      ? (run.stderr ? run.stderr + "\n" : "") + outcome.extraStderr
      : run.stderr;

    run.resolve({
      ok: outcome.ok,
      stdout: run.stdout,
      stderr,
      error: outcome.error,
      timedOut: outcome.timedOut,
      stopped: outcome.stopped,
      durationMs: Date.now() - run.startedAt,
    });
  }

  private killWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = null;
    this.resolveReady = null;
    this.rejectReady = null;
  }

  /** Run `code`. Always resolves — timeout / stop / load failure become
   *  `ok: false` results rather than throwing. */
  async run(code: string, opts: RunOptions = {}): Promise<RunResult> {
    if (this.active) {
      return {
        ok: false,
        stdout: "",
        stderr: "A program is already running.",
        error: "busy",
        durationMs: 0,
      };
    }

    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    try {
      await this.ensureReady();
    } catch (err) {
      return {
        ok: false,
        stdout: "",
        stderr: err instanceof Error ? err.message : String(err),
        error: "load-failed",
        durationMs: 0,
      };
    }

    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise<RunResult>((resolve) => {
      const timer = setTimeout(() => {
        this.finish({
          ok: false,
          error: "timeout",
          extraStderr: `Timed out after ${Math.round(
            timeoutMs / 1000,
          )}s — check for an infinite loop.`,
          timedOut: true,
        });
        this.killWorker();
        this.emit("idle");
      }, timeoutMs);

      this.active = {
        id,
        resolve,
        stdout: "",
        stderr: "",
        startedAt: Date.now(),
        timer,
        onStdout: opts.onStdout,
        onStderr: opts.onStderr,
      };

      const req: RunRequest = { type: "run", id, code, stdin: opts.stdin };
      this.worker!.postMessage(req);
    });
  }

  /** Stop the in-flight run. Same kill path as a timeout. No-op when idle. */
  stop(): void {
    if (!this.active) return;
    clearTimeout(this.active.timer);
    this.finish({
      ok: false,
      error: "stopped",
      extraStderr: "Stopped.",
      stopped: true,
    });
    this.killWorker();
    this.emit("idle");
  }
}

let instance: PythonRunner | null = null;

/** The shared session runner. Constructs nothing until a method is called. */
export function getPythonRunner(): PythonRunner {
  if (!instance) instance = new PythonRunner();
  return instance;
}

export type { PythonRunner };
