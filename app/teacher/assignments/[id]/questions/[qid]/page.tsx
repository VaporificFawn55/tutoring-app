"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Question } from "@/lib/types";

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const qid = params.qid as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(1);
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const snap = await getDoc(
        doc(db, "assignments", id, "questions", qid)
      );
      if (!snap.exists()) {
        router.replace(`/teacher/assignments/${id}`);
        return;
      }
      const q = snap.data() as Question;
      setOrder(q.order);
      setPrompt(q.prompt);
      setChoices(q.choices ?? ["", ""]);
      setCorrectIndex(q.correctIndex ?? 0);
      setLoading(false);
    }
    load();
  }, [id, qid, router]);

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

    if (choices.some((c) => c.trim() === "")) {
      setError("All choices must have text.");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "assignments", id, "questions", qid), {
        order: Number(order),
        prompt: prompt.trim(),
        choices: choices.map((c) => c.trim()),
        correctIndex: Number(correctIndex),
      });
      router.push(`/teacher/assignments/${id}`);
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this question?")) return;
    await deleteDoc(doc(db, "assignments", id, "questions", qid));
    router.push(`/teacher/assignments/${id}`);
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push(`/teacher/assignments/${id}`)}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Assignment
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Edit Question</h1>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 uppercase">
          Multiple Choice
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
        </div>

        <div>
          <label className={labelClass}>Prompt</label>
          <textarea
            required
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={inputClass}
          />
        </div>

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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/teacher/assignments/${id}`)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete Question
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
