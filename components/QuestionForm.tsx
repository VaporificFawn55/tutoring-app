"use client";

import { useState, FormEvent } from "react";
import type { Question, QuestionType } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export type QuestionPayload = {
  type: QuestionType;
  order: number;
  prompt: string;
  code?: string;
  choices?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  starterCode?: string;
  expectedStdout?: string;
  stdinInput?: string;
  manualGrade: boolean;
};

interface Props {
  existingQuestions: Question[];
  currentQid?: string;       // exclude self when checking duplicates (edit mode)
  defaultOrder: number;      // pre-filled initial value for order
  initialValues?: {
    type: QuestionType;
    order: number;
    prompt: string;
    code?: string;
    choices?: string[];
    correctIndex?: number;
    correctAnswer?: string;
    starterCode?: string;
    expectedStdout?: string;
    stdinInput?: string;
    manualGrade?: boolean;
  };
  submitLabel: string;
  onSubmit: (payload: QuestionPayload) => Promise<void>;
  onCancel: () => void;
}

// `fake_compiler` is intentionally absent — existing ones still render, but new
// code questions are authored as `code_exercise` (which actually runs).
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "type_output", label: "Type Output" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "code_exercise", label: "Code Exercise" },
  { value: "free_text", label: "Free Text" },
];

const CODE_TYPES = new Set<QuestionType>(["type_output", "fill_blank", "fake_compiler"]);

export default function QuestionForm({
  existingQuestions,
  currentQid,
  defaultOrder,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [type, setType] = useState<QuestionType>(initialValues?.type ?? "multiple_choice");
  const [order, setOrder] = useState(initialValues?.order ?? defaultOrder);
  const [prompt, setPrompt] = useState(initialValues?.prompt ?? "");
  const [code, setCode] = useState(initialValues?.code ?? "");
  const [choices, setChoices] = useState<string[]>(initialValues?.choices ?? ["", ""]);
  const [correctIndex, setCorrectIndex] = useState(initialValues?.correctIndex ?? 0);
  const [correctAnswer, setCorrectAnswer] = useState(initialValues?.correctAnswer ?? "");
  const [starterCode, setStarterCode] = useState(initialValues?.starterCode ?? "");
  const [expectedStdout, setExpectedStdout] = useState(
    initialValues?.expectedStdout ?? ""
  );
  const [stdinInput, setStdinInput] = useState(initialValues?.stdinInput ?? "");
  const [autoGrade, setAutoGrade] = useState(
    initialValues?.type === "code_exercise"
      ? initialValues?.manualGrade !== true
      : true
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Soft duplicate order warning
  const duplicate = existingQuestions.find(
    (q) => q.order === Number(order) && q.id !== currentQid
  );

  function handleTypeChange(newType: QuestionType) {
    // Reset MC-specific state when leaving/entering MC
    if (type === "multiple_choice" || newType === "multiple_choice") {
      setChoices(["", ""]);
      setCorrectIndex(0);
    }
    // Reset code-snippet state only when leaving all snippet-based types
    if (CODE_TYPES.has(type) && !CODE_TYPES.has(newType)) {
      setCode("");
      setCorrectAnswer("");
    }
    // Reset code_exercise state when leaving it
    if (type === "code_exercise" && newType !== "code_exercise") {
      setStarterCode("");
      setExpectedStdout("");
      setStdinInput("");
      setAutoGrade(true);
    }
    setType(newType);
    setError("");
  }

  function addChoice() {
    setChoices((prev) => [...prev, ""]);
  }

  function removeChoice(i: number) {
    if (choices.length <= 2) return;
    const next = choices.filter((_, idx) => idx !== i);
    setChoices(next);
    if (correctIndex >= next.length) setCorrectIndex(next.length - 1);
  }

  function updateChoice(i: number, value: string) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? value : c)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!prompt.trim()) { setError("Prompt is required."); return; }

    if (type === "multiple_choice" && choices.some((c) => c.trim() === "")) {
      setError("All choices must have text."); return;
    }
    if (CODE_TYPES.has(type)) {
      if (!code.trim()) { setError("Code is required."); return; }
      if (!correctAnswer.trim()) { setError("Expected answer is required."); return; }
    }
    if (type === "code_exercise" && autoGrade && !expectedStdout.trim()) {
      setError("Expected output is required for auto-grading (or uncheck it).");
      return;
    }

    let payload: QuestionPayload;
    if (type === "multiple_choice") {
      payload = {
        type,
        order: Number(order),
        prompt: prompt.trim(),
        choices: choices.map((c) => c.trim()),
        correctIndex: Number(correctIndex),
        manualGrade: false,
      };
    } else if (type === "free_text") {
      payload = { type, order: Number(order), prompt: prompt.trim(), manualGrade: true };
    } else if (type === "code_exercise") {
      payload = {
        type,
        order: Number(order),
        prompt: prompt.trim(),
        manualGrade: !autoGrade,
        ...(starterCode.trim() ? { starterCode } : {}),
        ...(autoGrade && expectedStdout.trim() ? { expectedStdout } : {}),
        ...(stdinInput.trim() ? { stdinInput } : {}),
      };
    } else {
      payload = {
        type,
        order: Number(order),
        prompt: prompt.trim(),
        code: code.trim(),
        correctAnswer: correctAnswer.trim(),
        manualGrade: false,
      };
    }

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Question Type">
        <Select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
          {initialValues?.type === "fake_compiler" && (
            <option value="fake_compiler">Fake Compiler (legacy)</option>
          )}
        </Select>
      </Field>

      <Field
        label="Order"
        hint={
          duplicate
            ? undefined
            : "Determines the position of this question in the assignment."
        }
      >
        <Input
          type="number"
          required
          min={1}
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="w-24"
        />
        {duplicate && (
          <p className="mt-1 text-xs text-warning">
            Note: another question (#{duplicate.order} — &ldquo;
            {duplicate.prompt.length > 50
              ? duplicate.prompt.slice(0, 50) + "…"
              : duplicate.prompt}
            &rdquo;) also uses this order number.
          </p>
        )}
      </Field>

      <Field label="Prompt">
        <Textarea
          autoGrow
          required
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[76px]"
          placeholder="Question text shown to the student"
        />
      </Field>

      {/* Code — type_output, fill_blank, fake_compiler */}
      {CODE_TYPES.has(type) && (
        <Field
          label={
            type === "fill_blank"
              ? "Code (use ____ for the blank)"
              : "Python snippet"
          }
        >
          <Textarea
            required
            rows={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-xs leading-relaxed"
            placeholder={
              type === "fill_blank"
                ? "fruits = ____\nprint(fruits)"
                : "print('hello')"
            }
          />
        </Field>
      )}

      {/* Expected answer — type_output, fill_blank, fake_compiler */}
      {CODE_TYPES.has(type) && (
        <Field
          label={
            type === "fill_blank"
              ? "Correct token (fills the blank)"
              : "Expected output"
          }
          hint="Graded case-insensitively with leading/trailing whitespace trimmed."
        >
          <Input
            required
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder={type === "fill_blank" ? "len" : "hello"}
          />
        </Field>
      )}

      {/* Code Exercise */}
      {type === "code_exercise" && (
        <>
          <Field
            label="Starter code"
            hint="Prefilled into the student's editor. Leave blank for an empty editor."
          >
            <Textarea
              autoGrow
              rows={4}
              value={starterCode}
              onChange={(e) => setStarterCode(e.target.value)}
              className="font-mono text-xs leading-relaxed"
              placeholder={"def solve(n):\n    # your code here\n    pass"}
            />
          </Field>

          <Field
            label="Program input (stdin)"
            hint="Optional. One line per input() call, fed to every run."
          >
            <Textarea
              rows={2}
              value={stdinInput}
              onChange={(e) => setStdinInput(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={autoGrade}
              onChange={(e) => setAutoGrade(e.target.checked)}
              className="accent-brand"
            />
            Auto-grade by comparing the program&rsquo;s output
          </label>

          {autoGrade ? (
            <Field
              label="Expected output"
              hint="The run's stdout must match this (trailing whitespace ignored)."
            >
              <Textarea
                autoGrow
                rows={3}
                value={expectedStdout}
                onChange={(e) => setExpectedStdout(e.target.value)}
                className="font-mono text-xs leading-relaxed"
              />
            </Field>
          ) : (
            <Alert tone="warning">
              This exercise will land in the grading queue for you to review by
              hand.
            </Alert>
          )}
        </>
      )}

      {/* Choices — multiple_choice */}
      {type === "multiple_choice" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="block text-sm font-medium text-ink">Choices</span>
            <button
              type="button"
              onClick={addChoice}
              className="text-sm text-brand hover:underline"
            >
              + Add choice
            </button>
          </div>
          <div className="space-y-2">
            {choices.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctIndex"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  title="Mark as correct answer"
                  className="accent-brand"
                />
                <Input
                  required
                  value={c}
                  onChange={(e) => updateChoice(i, e.target.value)}
                  placeholder={`Choice ${i + 1}`}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeChoice(i)}
                  disabled={choices.length <= 2}
                  className="text-sm text-danger hover:opacity-80 disabled:opacity-30"
                  title="Remove choice"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Select the radio button next to the correct answer.
          </p>
        </div>
      )}

      {/* Free text note */}
      {type === "free_text" && (
        <Alert tone="warning">
          Free text answers are not auto-graded. The teacher reviews them
          manually from the review queue.
        </Alert>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex gap-3">
        <Button type="submit" loading={saving} loadingLabel="Saving…">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
