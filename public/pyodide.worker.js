/*
 * Pyodide module worker — plain ESM, served verbatim from public/.
 *
 * NOT bundled, NOT transpiled, NOT type-checked, NOT in any client chunk.
 * It mirrors the message protocol in lib/python/protocol.ts by hand — if you
 * change one, change the other.
 *
 * Must be constructed as `new Worker(url, { type: "module" })`: current Pyodide
 * ships pyodide.asm.mjs as an ES module and does not support classic workers.
 *
 * Pyodide (~10 MB on first load) is fetched from the jsDelivr CDN. To self-host,
 * download the release into public/pyodide/ and repoint the two URLs below.
 */

import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/pyodide.mjs";

const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.6/full/";

let pyodidePromise = null;

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  }
  return pyodidePromise;
}

// Begin loading immediately; report readiness to the main thread.
self.postMessage({ type: "status", status: "loading" });
getPyodide().then(
  () => self.postMessage({ type: "status", status: "ready" }),
  (err) =>
    self.postMessage({
      type: "status",
      status: "error",
      error: String(err),
    }),
);

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "run") return;

  const { id, code, stdin } = msg;

  let pyodide;
  try {
    pyodide = await getPyodide();
  } catch (err) {
    self.postMessage({
      type: "done",
      id,
      ok: false,
      error: "Python failed to load: " + String(err),
    });
    return;
  }

  // Line-batched stdout/stderr so output streams as it is produced.
  pyodide.setStdout({
    batched: (text) => self.postMessage({ type: "stdout", id, text: text + "\n" }),
  });
  pyodide.setStderr({
    batched: (text) => self.postMessage({ type: "stderr", id, text: text + "\n" }),
  });

  // stdin: feed the supplied lines one per input() call, then EOF (null).
  const lines = String(stdin ?? "").length ? String(stdin).split("\n") : [];
  let lineIdx = 0;
  pyodide.setStdin({
    stdin: () => (lineIdx < lines.length ? lines[lineIdx++] : null),
    isatty: false,
  });

  // Preload packages referenced by imports: `import math` is a no-op,
  // `import numpy` gets fetched. A bad import here must not abort the run.
  try {
    await pyodide.loadPackagesFromImports(code);
  } catch (err) {
    self.postMessage({
      type: "stderr",
      id,
      text: "Could not preload packages: " + String(err) + "\n",
    });
  }

  // Fresh globals dict per run so state never leaks between runs.
  const globals = pyodide.globals.get("dict")();
  try {
    await pyodide.runPythonAsync(code, { globals });
    self.postMessage({ type: "done", id, ok: true });
  } catch (err) {
    const text = String(err && err.message ? err.message : err);
    if (text.includes("EOFError")) {
      self.postMessage({
        type: "stderr",
        id,
        text:
          "\nYour program called input() but no input was provided — " +
          "fill in the Program input box above.\n",
      });
    } else {
      self.postMessage({
        type: "stderr",
        id,
        text: text.endsWith("\n") ? text : text + "\n",
      });
    }
    self.postMessage({ type: "done", id, ok: false, error: text });
  } finally {
    globals.destroy();
  }
};
