"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, getDoc, getDocs, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStudentUid } from "@/lib/scoring";
import type { Assignment, Attempt, Question, Submission } from "@/lib/types";

type QuestionWithAttempts = {
  question: Question;
  attempts: Attempt[];
};

export default function ProgressPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rows, setRows] = useState<QuestionWithAttempts[]>([]);
  const [noStudent, setNoStudent] = useState(false);

  useEffect(() => {
    async function load() {
      const aSnap = await getDoc(doc(db, "assignments", id));
      if (!aSnap.exists()) {
        router.replace("/teacher");
        return;
      }
      setAssignment({ id: aSnap.id, ...aSnap.data() } as Assignment);

      const qSnap = await getDocs(
        query(collection(db, "assignments", id, "questions"), orderBy("order"))
      );
      const questions = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);

      const studentUid = await getStudentUid();
      if (!studentUid) {
        setNoStudent(true);
        setRows(questions.map((q) => ({ question: q, attempts: [] })));
        setLoading(false);
        return;
      }

      const subId = `${studentUid}_${id}`;
      const subSnap = await getDoc(doc(db, "submissions", subId));
      if (subSnap.exists()) {
        setSubmission({ id: subSnap.id, ...subSnap.data() } as Submission);
      }

      const attSnap = await getDocs(
        query(collection(db, "submissions", subId, "attempts"), orderBy("createdAt"))
      );
      const attempts = attSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Attempt);

      setRows(
        questions.map((q) => ({
          question: q,
          attempts: attempts.filter((a) => a.questionId === q.id),
        }))
      );
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) return <p className="text-gray-500">Loading…</p>;

  const totalQuestions = rows.length;
  const gradedCorrect = rows.reduce(
    (sum, r) => sum + r.attempts.filter((a) => a.gradedManually === true).length,
    0
  );
  const achieved = (submission?.autoScore ?? 0) + gradedCorrect;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/teacher/assignments/${id}`)}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← {assignment?.title}
        </button>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900">Student Progress</h1>

      {noStudent && (
        <p className="text-sm text-amber-700 rounded bg-amber-50 border border-amber-200 px-3 py-2">
          No student account found yet.
        </p>
      )}

      {!noStudent && !submission && <p className="text-gray-500">Not started.</p>}

      {submission && (
        <div className="flex gap-8 rounded-lg border border-gray-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-medium text-gray-900 capitalize">
              {submission.status.replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Auto score</p>
            <p className="font-medium text-gray-900">
              {submission.autoScore}/{submission.totalAutoGradable}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Overall score</p>
            <p className="font-medium text-gray-900">
              {achieved}/{totalQuestions}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {rows.map(({ question, attempts }, i) => (
          <div
            key={question.id}
            className="rounded-lg border border-gray-200 bg-white px-5 py-4"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="font-medium text-gray-900">
                <span className="mr-2 text-xs text-gray-400">Q{i + 1}</span>
                {question.prompt}
              </p>
              <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 uppercase">
                {question.type}
              </span>
            </div>

            {attempts.length === 0 ? (
              <p className="text-sm text-gray-400">Not attempted.</p>
            ) : (
              <ul className="space-y-1.5">
                {attempts.map((a, idx) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 text-sm border-t border-gray-100 pt-1.5 first:border-0 first:pt-0"
                  >
                    <span className="text-gray-700 truncate">
                      <span className="text-xs text-gray-400 mr-2">#{idx + 1}</span>
                      &ldquo;{a.answer}&rdquo;
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <StatusBadge attempt={a} />
                      <span className="text-xs text-gray-400">
                        {(a.timeSpentMs / 1000).toFixed(1)}s
                      </span>
                      <span className="text-xs text-gray-400">
                        {a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ attempt }: { attempt: Attempt }) {
  if (attempt.isCorrect === null) {
    if (attempt.gradedManually === true) {
      return (
        <span className="text-xs font-medium rounded-full bg-green-100 text-green-700 px-2 py-0.5">
          Correct
        </span>
      );
    }
    if (attempt.gradedManually === false) {
      return (
        <span className="text-xs font-medium rounded-full bg-red-100 text-red-700 px-2 py-0.5">
          Incorrect
        </span>
      );
    }
    return (
      <span className="text-xs font-medium rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">
        Pending review
      </span>
    );
  }
  return attempt.isCorrect ? (
    <span className="text-xs font-medium rounded-full bg-green-100 text-green-700 px-2 py-0.5">
      Correct
    </span>
  ) : (
    <span className="text-xs font-medium rounded-full bg-red-100 text-red-700 px-2 py-0.5">
      Incorrect
    </span>
  );
}
