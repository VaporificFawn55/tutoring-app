import type { Question } from "./types";

/**
 * Whether a question is graded automatically (vs. landing in the manual
 * grading queue). Replaces the old `q.type !== "free_text"` shorthand now that
 * `code_exercise` can be either, depending on whether the author supplied an
 * `expectedStdout` target.
 */
export function isAutoGradable(
  q: Pick<Question, "type" | "manualGrade" | "expectedStdout">,
): boolean {
  if (q.type === "free_text") return false;
  if (q.type === "code_exercise") {
    return (
      !q.manualGrade &&
      typeof q.expectedStdout === "string" &&
      q.expectedStdout.trim().length > 0
    );
  }
  return !q.manualGrade;
}

/**
 * Normalize program output for comparison: CRLF -> LF, strip trailing spaces
 * per line, drop trailing blank lines. Leading whitespace is significant and
 * left alone.
 */
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n+$/, "");
}

/**
 * Grade a code_exercise attempt by comparing its captured stdout to the
 * author's `expectedStdout`. Returns `null` when there is no target, meaning
 * the attempt must be graded by hand.
 */
export function gradeCodeExercise(
  q: Pick<Question, "expectedStdout">,
  stdout: string,
): boolean | null {
  if (typeof q.expectedStdout !== "string" || q.expectedStdout.trim() === "") {
    return null;
  }
  return normalizeOutput(stdout) === normalizeOutput(q.expectedStdout);
}
