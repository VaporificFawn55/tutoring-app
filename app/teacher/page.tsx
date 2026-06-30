"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const snap = await getDocs(
      query(collection(db, "assignments"), orderBy("order"))
    );
    setAssignments(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Assignment)
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
        <button
          onClick={() => router.push("/teacher/assignments/new")}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Assignment
        </button>
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
