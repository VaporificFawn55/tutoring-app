"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, Question } from "@/lib/types";

export default function AssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Edit form state — pre-filled once assignment loads
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function load() {
      const aSnap = await getDoc(doc(db, "assignments", id));
      if (!aSnap.exists()) {
        router.replace("/teacher");
        return;
      }
      const a = { id: aSnap.id, ...aSnap.data() } as Assignment;
      setTitle(a.title);
      setDescription(a.description);
      setOrder(a.order);

      const qSnap = await getDocs(
        query(
          collection(db, "assignments", id, "questions"),
          orderBy("order")
        )
      );
      setQuestions(
        qSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
      );
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    try {
      await updateDoc(doc(db, "assignments", id), {
        title: title.trim(),
        description: description.trim(),
        order: Number(order),
      });
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveError("Failed to save.");
    }
    setSaving(false);
  }

  async function handleDeleteQuestion(qid: string) {
    if (!confirm("Delete this question?")) return;
    await deleteDoc(doc(db, "assignments", id, "questions", qid));
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/teacher")}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Assignments
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Edit Assignment</h1>
      </div>

      {/* Assignment form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
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
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {saveMsg && (
            <span className="text-sm text-green-600">{saveMsg}</span>
          )}
        </div>
      </form>

      {/* Questions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
          <button
            onClick={() =>
              router.push(`/teacher/assignments/${id}/questions/new`)
            }
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Question
          </button>
        </div>

        {questions.length === 0 && (
          <p className="text-sm text-gray-500">No questions yet.</p>
        )}

        <ul className="space-y-2">
          {questions.map((q) => (
            <li
              key={q.id}
              className="flex items-start justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <span className="mr-2 text-xs text-gray-400">#{q.order}</span>
                <span className="mr-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 uppercase">
                  {q.type}
                </span>
                <span className="text-sm text-gray-900 break-words">
                  {q.prompt}
                </span>
              </div>
              <div className="ml-4 flex shrink-0 gap-2">
                <button
                  onClick={() =>
                    router.push(
                      `/teacher/assignments/${id}/questions/${q.id}`
                    )
                  }
                  className="rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteQuestion(q.id)}
                  className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const inputClass =
  "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
