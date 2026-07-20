"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getScoreSummary, ScoreSummary } from "@/lib/scoring";
import type { Question, Submission } from "@/lib/types";

type Feedback = "idle" | "correct" | "incorrect" | "submitted";

function grade(q: Question, answer: string): boolean | null {
  if (q.type === "free_text") return null;
  if (q.type === "multiple_choice")
    return Number(answer) === (q.correctIndex ?? -1);
  return (
    answer.trim().toLowerCase() === (q.correctAnswer ?? "").trim().toLowerCase()
  );
}

export default function AssignmentRunnerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [autoScore, setAutoScore] = useState(0);
  const [totalAutoGradable, setTotalAutoGradable] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [answer, setAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<ScoreSummary | null>(null);

  const questionStartTime = useRef(Date.now());
  const nextIdxRef = useRef(0);
  const subId = user ? `${user.uid}_${id}` : "";

  useEffect(() => {
    if (!user) return;
    async function load() {
      const qSnap = await getDocs(
        query(
          collection(db, "assignments", id, "questions"),
          orderBy("order")
        )
      );
      const qs = qSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Question
      );
      const autoGradable = qs.filter((q) => q.type !== "free_text").length;

      const subRef = doc(db, "submissions", subId);
      const subSnap = await getDoc(subRef);
      if (!subSnap.exists()) {
        await setDoc(subRef, {
          studentUid: user!.uid,
          assignmentId: id,
          status: "in_progress",
          autoScore: 0,
          totalAutoGradable: autoGradable,
          startedAt: serverTimestamp(),
        });
      }

      const attSnap = await getDocs(
        collection(db, "submissions", subId, "attempts")
      );
      const done = new Set<string>();
      attSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.isCorrect === true || data.isCorrect === null) {
          done.add(data.questionId as string);
        }
      });

      const existingSub = subSnap.exists()
        ? (subSnap.data() as Omit<Submission, "id">)
        : null;
      const resumeScore = existingSub?.autoScore ?? 0;

      setQuestions(qs);
      setTotalAutoGradable(autoGradable);
      setDoneIds(done);
      setAutoScore(resumeScore);

      const firstUndone = qs.findIndex((q) => !done.has(q.id));
      setCurrentIdx(firstUndone === -1 ? 0 : firstUndone);
      setLoading(false);
      questionStartTime.current = Date.now();
    }
    load();
  }, [user, id, subId]);

  const allDone = !loading && doneIds.size === questions.length && questions.length > 0;

  useEffect(() => {
    if (!allDone || !user) return;
    getScoreSummary(id, user.uid).then(setFinalScore);
  }, [allDone, user, id]);

  async function handleSubmit() {
    if (!user || submitting) return;
    const question = questions[currentIdx];
    setSubmitting(true);

    const answerValue =
      question.type === "multiple_choice"
        ? String(selectedChoice)
        : answer;
    const timeSpentMs = Date.now() - questionStartTime.current;
    const isCorrect = grade(question, answerValue);

    await addDoc(collection(db, "submissions", subId, "attempts"), {
      questionId: question.id,
      answer: answerValue,
      isCorrect,
      gradedManually: null,
      timeSpentMs,
      createdAt: serverTimestamp(),
    });

    const newFeedback: Feedback =
      isCorrect === null ? "submitted" : isCorrect ? "correct" : "incorrect";
    setFeedback(newFeedback);

    if (isCorrect === true || isCorrect === null) {
      const newDone = new Set(doneIds);
      newDone.add(question.id);

      const newAutoScore = [...newDone].filter((qid) => {
        const q = questions.find((q) => q.id === qid);
        return q && q.type !== "free_text";
      }).length;

      const nextIdx = questions.findIndex((q) => !newDone.has(q.id));
      nextIdxRef.current = nextIdx;
      const newAllDone = newDone.size === questions.length;

      const subRef = doc(db, "submissions", subId);
      await updateDoc(subRef, {
        autoScore: newAutoScore,
        ...(newAllDone
          ? { status: "completed", completedAt: serverTimestamp() }
          : {}),
      });

      setDoneIds(newDone);
      setAutoScore(newAutoScore);
    }

    setSubmitting(false);
  }

  function advance() {
    setCurrentIdx(nextIdxRef.current);
    setFeedback("idle");
    setAnswer("");
    setSelectedChoice(0);
    questionStartTime.current = Date.now();
  }

  if (loading) return <p className="text-gray-500 p-6">Loading…</p>;

  if (allDone) {
    return (
      <div className="max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/student")}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Assignments
          </button>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-8 text-center">
          <p className="text-lg font-semibold text-green-800">
            Assignment complete
          </p>
          <p className="mt-2 text-gray-700">
            Auto score: {autoScore}/{totalAutoGradable}
          </p>
          {finalScore && finalScore.total > finalScore.totalAutoGradable && (
            <p className="mt-1 text-gray-700">
              Overall score: {finalScore.achieved}/{finalScore.total}
            </p>
          )}
          <button
            onClick={() => router.push("/student")}
            className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            ← Back to assignments
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];
  const inputDisabled = feedback !== "idle" || submitting;

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/student")}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Assignments
        </button>
        <span className="text-sm text-gray-500">
          Question {currentIdx + 1} of {questions.length}
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white px-6 py-5 space-y-4">
        <p className="font-medium text-gray-900">{question.prompt}</p>

        {/* Code display */}
        {question.type === "type_output" || question.type === "fill_blank" ? (
          <pre className="rounded bg-gray-100 p-3 text-sm font-mono text-gray-800 whitespace-pre-wrap">
            {question.code}
          </pre>
        ) : question.type === "fake_compiler" ? (
          <pre className="rounded bg-gray-900 text-green-400 p-3 text-sm font-mono whitespace-pre-wrap">
            {question.code}
          </pre>
        ) : null}

        {/* Answer input */}
        {question.type === "multiple_choice" && question.choices ? (
          <fieldset className="space-y-2">
            {question.choices.map((choice, i) => (
              <label
                key={i}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="choice"
                  value={i}
                  checked={selectedChoice === i}
                  onChange={() => setSelectedChoice(i)}
                  disabled={inputDisabled}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-800">{choice}</span>
              </label>
            ))}
          </fieldset>
        ) : question.type === "free_text" ? (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={inputDisabled}
            rows={4}
            placeholder="Your answer…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          />
        ) : (
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={inputDisabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" && feedback === "idle" && !submitting) {
                handleSubmit();
              }
            }}
            placeholder="Your answer…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
          />
        )}

        {/* Feedback */}
        {feedback === "correct" && (
          <p className="text-sm font-medium text-green-700">Correct!</p>
        )}
        {feedback === "incorrect" && (
          <p className="text-sm font-medium text-red-600">
            Incorrect — try again.
          </p>
        )}
        {feedback === "submitted" && (
          <p className="text-sm font-medium text-blue-700">
            Answer submitted for review.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {feedback === "idle" && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          )}
          {(feedback === "correct" || feedback === "submitted") && (
            <button
              onClick={advance}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next →
            </button>
          )}
          {feedback === "incorrect" && (
            <button
              onClick={() => {
                setFeedback("idle");
              }}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
