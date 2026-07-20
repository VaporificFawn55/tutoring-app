"use client";

import { useEffect, useState } from "react";
import {
  collectionGroup,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Attempt, Submission } from "@/lib/types";

type PendingItem = {
  attemptRef: DocumentReference;
  attempt: Attempt;
  assignmentTitle: string;
  questionPrompt: string;
};

export default function ReviewQueuePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    // No `where` filter here on purpose — a filtered collectionGroup query
    // needs an explicit collection-group index; a plain fetch doesn't.
    // Volume is low for a single-student app, so filtering client-side is fine.
    const snap = await getDocs(collectionGroup(db, "attempts"));
    const pending = snap.docs.filter((d) => {
      const data = d.data();
      return data.isCorrect === null && data.gradedManually === null;
    });

    const assignmentCache = new Map<string, string>();
    const questionCache = new Map<string, string>();

    const resolved = await Promise.all(
      pending.map(async (attemptDoc) => {
        const attempt = { id: attemptDoc.id, ...attemptDoc.data() } as Attempt;
        const subRef = attemptDoc.ref.parent.parent;
        if (!subRef) return null;
        const subSnap = await getDoc(subRef);
        if (!subSnap.exists()) return null;
        const submission = subSnap.data() as Omit<Submission, "id">;
        const assignmentId = submission.assignmentId;

        let assignmentTitle = assignmentCache.get(assignmentId);
        if (!assignmentTitle) {
          const aSnap = await getDoc(doc(db, "assignments", assignmentId));
          assignmentTitle = aSnap.exists()
            ? (aSnap.data().title as string)
            : "Unknown assignment";
          assignmentCache.set(assignmentId, assignmentTitle);
        }

        const qKey = `${assignmentId}/${attempt.questionId}`;
        let questionPrompt = questionCache.get(qKey);
        if (!questionPrompt) {
          const qSnap = await getDoc(
            doc(db, "assignments", assignmentId, "questions", attempt.questionId)
          );
          questionPrompt = qSnap.exists()
            ? (qSnap.data().prompt as string)
            : "Unknown question";
          questionCache.set(qKey, questionPrompt);
        }

        return {
          attemptRef: attemptDoc.ref,
          attempt,
          assignmentTitle,
          questionPrompt,
        } as PendingItem;
      })
    );

    setItems(
      resolved
        .filter((r): r is PendingItem => r !== null)
        .sort(
          (a, b) =>
            (a.attempt.createdAt?.toMillis?.() ?? 0) -
            (b.attempt.createdAt?.toMillis?.() ?? 0)
        )
    );
    setLoading(false);
  }

  async function grade(item: PendingItem, correct: boolean) {
    setGradingId(item.attempt.id);
    await updateDoc(item.attemptRef, { gradedManually: correct });
    setItems((prev) => prev.filter((i) => i.attempt.id !== item.attempt.id));
    setGradingId(null);
  }

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Review Queue</h1>

      {items.length === 0 && (
        <p className="text-gray-500">No free-text answers awaiting review.</p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.attempt.id}
            className="rounded-lg border border-gray-200 bg-white px-5 py-4 space-y-3"
          >
            <div>
              <p className="text-xs text-gray-500">{item.assignmentTitle}</p>
              <p className="font-medium text-gray-900">{item.questionPrompt}</p>
            </div>
            <p className="rounded bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
              {item.attempt.answer}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => grade(item, true)}
                disabled={gradingId === item.attempt.id}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Correct
              </button>
              <button
                onClick={() => grade(item, false)}
                disabled={gradingId === item.attempt.id}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Incorrect
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
