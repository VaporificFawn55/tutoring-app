"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getScoreSummary, ScoreSummary } from "@/lib/scoring";
import type { Assignment } from "@/lib/types";

type AssignmentRow = {
  assignment: Assignment;
  score: ScoreSummary;
};

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const snap = await getDocs(
        query(collection(db, "assignments"), orderBy("order"))
      );
      const assignments = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Assignment
      );
      const rowsData = await Promise.all(
        assignments.map(async (a) => ({
          assignment: a,
          score: await getScoreSummary(a.id, user!.uid),
        }))
      );
      setRows(rowsData);
      setLoading(false);
    }
    load();
  }, [user]);

  if (loading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Your Assignments
      </h1>
      {rows.length === 0 && (
        <p className="text-gray-500">No assignments yet.</p>
      )}
      <ul className="space-y-3">
        {rows.map(({ assignment, score }) => {
          const status = score.submission?.status ?? null;
          const hasFreeText = score.total > score.totalAutoGradable;
          return (
            <li key={assignment.id}>
              <button
                onClick={() =>
                  router.push(`/student/assignments/${assignment.id}`)
                }
                className="w-full text-left rounded-lg border border-gray-200 bg-white px-5 py-4 hover:border-blue-400 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {assignment.title}
                    </p>
                    {assignment.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {assignment.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {status === null && (
                      <span className="text-xs font-medium rounded-full bg-gray-100 text-gray-600 px-2.5 py-0.5">
                        Not started
                      </span>
                    )}
                    {status === "in_progress" && (
                      <>
                        <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5">
                          In progress
                        </span>
                        <span className="text-xs text-gray-500">
                          Auto: {score.autoScore}/{score.totalAutoGradable}
                        </span>
                        {hasFreeText && (
                          <span className="text-xs text-gray-500">
                            Overall: {score.achieved}/{score.total}
                          </span>
                        )}
                      </>
                    )}
                    {status === "completed" && (
                      <>
                        <span className="text-xs font-medium rounded-full bg-green-100 text-green-700 px-2.5 py-0.5">
                          Completed
                        </span>
                        <span className="text-xs text-gray-500">
                          Auto: {score.autoScore}/{score.totalAutoGradable}
                        </span>
                        {hasFreeText && (
                          <span className="text-xs text-gray-500">
                            Overall: {score.achieved}/{score.total}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
