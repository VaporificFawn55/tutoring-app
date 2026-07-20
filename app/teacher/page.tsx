"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  collectionGroup,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment } from "@/lib/types";

export default function TeacherDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [aSnap, attSnap] = await Promise.all([
      getDocs(query(collection(db, "assignments"), orderBy("order"))),
      getDocs(collectionGroup(db, "attempts")),
    ]);
    setAssignments(
      aSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Assignment)
    );
    setNeedsReviewCount(
      attSnap.docs.filter((d) => {
        const data = d.data();
        return data.isCorrect === null && data.gradedManually === null;
      }).length
    );
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this assignment and all its questions?")) return;
    const qSnap = await getDocs(
      collection(db, "assignments", id, "questions")
    );
    await Promise.all(qSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "assignments", id));
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/teacher/review")}
            className="relative rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Review Queue
            {needsReviewCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {needsReviewCount}
              </span>
            )}
          </button>
          <button
            onClick={() => router.push("/teacher/assignments/new")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Assignment
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}

      {!loading && assignments.length === 0 && (
        <p className="text-gray-500">No assignments yet. Create one to get started.</p>
      )}

      <ul className="space-y-2">
        {assignments.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
          >
            <span className="text-gray-900">
              <span className="mr-2 text-sm text-gray-400">#{a.order}</span>
              {a.title}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/teacher/assignments/${a.id}/progress`)}
                className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
              >
                Progress
              </button>
              <button
                onClick={() => router.push(`/teacher/assignments/${a.id}`)}
                className="rounded px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
