"use client";

import { useState, FormEvent } from "react";
import type { Question, QuestionType } from "@/lib/types";

export type QuestionPayload = {
  type: QuestionType;
  order: number;
  prompt: string;
  code?: string;
  choices?: string[];
  correctIndex?: number;
  correctAnswer?: string;
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
  };
  submitLabel: string;
  onSubmit: (payload: QuestionPayload) => Promise<void>;
  onCancel: () => void;
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "type_output", label: "Type Output" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "fake_compiler", label: "Fake Compiler" },
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
    // Reset code-specific state only when leaving all code-based types
    if (CODE_TYPES.has(type) && !CODE_TYPES.has(newType)) {
      setCode("");
      setCorrectAnswer("");
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
      {/* Type selector */}
      <div>
        <label className={labelClass}>Question Type</label>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
          className={inputClass}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Order */}
      <div>
        <label className={labelClass}>Order</label>
        <input
          type="number"
          required
          min={1}
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className={`${inputClass} w-24`}
        />
        {duplicate && (
          <p className="mt-1 text-xs text-amber-600">
            Note: another question (#{duplicate.order} — &ldquo;
            {duplicate.prompt.length > 50
              ? duplicate.prompt.slice(0, 50) + "…"
              : duplicate.prompt}
            &rdquo;) also uses this order number.
          </p>
        )}
      </div>

      {/* Prompt — all types */}
      <div>
        <label className={labelClass}>Prompt</label>
        <textarea
          required
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className={inputClass}
          placeholder="Question text shown to the student"
        />
      </div>

      {/* Code — type_output, fill_blank, fake_compiler */}
      {CODE_TYPES.has(type) && (
        <div>
          <label className={labelClass}>
            {type === "fill_blank"
              ? "Code (use ____ for the blank)"
              : "Python snippet"}
          </label>
          <textarea
            required
            rows={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${inputClass} font-mono text-xs leading-relaxed`}
            placeholder={
              type === "fill_blank"
                ? "fruits = ____\nprint(fruits)"
                : "print('hello')"
            }
          />
        </div>
      )}

      {/* Expected answer — type_output, fill_blank, fake_compiler */}
      {CODE_TYPES.has(type) && (
        <div>
          <label className={labelClass}>
            {type === "fill_blank" ? "Correct token (fills the blank)" : "Expected output"}
          </label>
          <input
            required
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            className={inputClass}
            placeholder={type === "fill_blank" ? "len" : "hello"}
          />
          <p className="mt-1 text-xs text-gray-500">
            Graded case-insensitively with leading/trailing whitespace trimmed.
          </p>
        </div>
      )}

      {/* Choices — multiple_choice */}
      {type === "multiple_choice" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className={labelClass}>Choices</label>
            <button
              type="button"
              onClick={addChoice}
              className="text-sm text-blue-600 hover:underline"
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
                />
                <input
                  required
                  value={c}
                  onChange={(e) => updateChoice(i, e.target.value)}
                  placeholder={`Choice ${i + 1}`}
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeChoice(i)}
                  disabled={choices.length <= 2}
                  className="text-sm text-red-500 hover:text-red-700 disabled:opacity-30"
                  title="Remove choice"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            Select the radio button next to the correct answer.
          </p>
        </div>
      )}

      {/* Free text note */}
      {type === "free_text" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Free text answers are not auto-graded. The teacher reviews them
          manually from the review queue.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
