"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Question } from "@/lib/types";
import QuestionForm, { type QuestionPayload } from "@/components/QuestionForm";

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const qid = params.qid as string;

  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  useEffect(() => {
    async function load() {
      const [qSnap, allSnap] = await Promise.all([
        getDoc(doc(db, "assignments", id, "questions", qid)),
        getDocs(
          query(
            collection(db, "assignments", id, "questions"),
            orderBy("order")
          )
        ),
      ]);

      if (!qSnap.exists()) {
        router.replace(`/teacher/assignments/${id}`);
        return;
      }

      setQuestion({ id: qSnap.id, ...qSnap.data() } as Question);
      setAllQuestions(
        allSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
      );
      setLoading(false);
    }
    load();
  }, [id, qid, router]);

  async function handleSubmit(payload: QuestionPayload) {
    // Build the update, using deleteField() to remove optional fields
    // that don't belong to the new type — prevents stale data from a prior type.
    const update: Record<string, unknown> = {
      type: payload.type,
      order: payload.order,
      prompt: payload.prompt,
      manualGrade: payload.manualGrade,
      code: payload.code !== undefined ? payload.code : deleteField(),
      correctAnswer:
        payload.correctAnswer !== undefined
          ? payload.correctAnswer
          : deleteField(),
      choices: payload.choices !== undefined ? payload.choices : deleteField(),
      correctIndex:
        payload.correctIndex !== undefined
          ? payload.correctIndex
          : deleteField(),
    };
    await updateDoc(doc(db, "assignments", id, "questions", qid), update);
    router.push(`/teacher/assignments/${id}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this question?")) return;
    await deleteDoc(doc(db, "assignments", id, "questions", qid));
    router.push(`/teacher/assignments/${id}`);
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (!question) return null;

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/teacher/assignments/${id}`)}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Assignment
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Edit Question</h1>
        </div>
        <button
          onClick={handleDelete}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>

      <QuestionForm
        existingQuestions={allQuestions}
        currentQid={qid}
        defaultOrder={question.order}
        initialValues={{
          type: question.type,
          order: question.order,
          prompt: question.prompt,
          code: question.code,
          choices: question.choices,
          correctIndex: question.correctIndex,
          correctAnswer: question.correctAnswer,
        }}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/teacher/assignments/${id}`)}
      />
    </div>
  );
}
