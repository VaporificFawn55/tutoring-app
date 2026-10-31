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
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getScoreSummary, ScoreSummary } from "@/lib/scoring";
import { isAutoGradable, gradeCodeExercise, normalizeOutput } from "@/lib/questions";
import type { Attempt, Question, Submission } from "@/lib/types";
import type { RunResult } from "@/lib/python/protocol";
import { CodeRunner } from "@/components/code/CodeRunner";
import { OutputPanel } from "@/components/code/OutputPanel";
import { PythonEditor } from "@/components/code/PythonEditor";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";

type Feedback = "idle" | "correct" | "incorrect" | "submitted";

function grade(q: Question, answer: string): boolean | null {
  if (q.type === "free_text" || q.type === "code_exercise") return null;
  if (q.type === "multiple_choice")
    return Number(answer) === (q.correctIndex ?? -1);
  // normalizeOutput handles multi-line answers (e.g. ASCII art) robustly —
  // CRLF normalization, trailing-space-per-line and trailing-blank-line trim.
  return (
    normalizeOutput(answer).toLowerCase() ===
    normalizeOutput(q.correctAnswer ?? "").toLowerCase()
  );
}

export default function AssignmentRunnerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  // The attempt that counted (correct, or submitted for manual review) per
  // question — lets the student navigate back and see what they submitted.
  const [attemptByQuestion, setAttemptByQuestion] = useState<
    Record<string, Attempt>
  >({});
  const [autoScore, setAutoScore] = useState(0);
  const [totalAutoGradable, setTotalAutoGradable] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const [answer, setAnswer] = useState("");
  const [selectedChoice, setSelectedChoice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<ScoreSummary | null>(null);

  // code_exercise working state (reset per question)
  const [code, setCode] = useState("");
  const [runCount, setRunCount] = useState(0);
  const [lastRun, setLastRun] = useState<
    { stdout: string; stderr: string; durationMs: number } | null
  >(null);
  const [rerun, setRerun] = useState(false);

  // Set once the runner finishes loading and again on every navigation.
  const questionStartTime = useRef(0);
  const subId = user ? `${user.uid}_${id}` : "";

  useEffect(() => {
    if (!user) return;
    // The interactive runner writes to Firestore on mount (creates the
    // submission doc) and on every submit. A previewing teacher must never
    // trigger that on the real student's behalf — send them to the
    // read-only review page instead.
    if (role === "teacher") {
      router.replace(`/student/assignments/${id}/review`);
      return;
    }
    async function load() {
      let assignmentSnap;
      try {
        assignmentSnap = await getDoc(doc(db, "assignments", id));
      } catch {
        router.replace("/student");
        return;
      }
      if (!assignmentSnap.exists() || assignmentSnap.data().published !== true) {
        router.replace("/student");
        return;
      }

      const qSnap = await getDocs(
        query(
          collection(db, "assignments", id, "questions"),
          orderBy("order")
        )
      );
      const qs = qSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Question
      );
      const autoGradable = qs.filter(isAutoGradable).length;

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
      const counted: Record<string, Attempt> = {};
      attSnap.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() } as Attempt;
        if (data.isCorrect === true || data.isCorrect === null) {
          done.add(data.questionId);
          const existing = counted[data.questionId];
          if (
            !existing ||
            (data.createdAt?.toMillis?.() ?? 0) >=
              (existing.createdAt?.toMillis?.() ?? 0)
          ) {
            counted[data.questionId] = data;
          }
        }
      });

      const existingSub = subSnap.exists()
        ? (subSnap.data() as Omit<Submission, "id">)
        : null;
      const resumeScore = existingSub?.autoScore ?? 0;

      setQuestions(qs);
      setTotalAutoGradable(autoGradable);
      setDoneIds(done);
      setAttemptByQuestion(counted);
      setAutoScore(resumeScore);

      const firstUndone = qs.findIndex((q) => !done.has(q.id));
      const startIdx = firstUndone === -1 ? 0 : firstUndone;
      setCurrentIdx(startIdx);
      setCode(qs[startIdx]?.starterCode ?? "");
      setLoading(false);
      questionStartTime.current = Date.now();
    }
    load();
  }, [user, role, id, subId, router]);

  const allDone = !loading && doneIds.size === questions.length && questions.length > 0;

  useEffect(() => {
    if (!allDone || !user) return;
    getScoreSummary(id, user.uid).then(setFinalScore);
  }, [allDone, user, id]);

  function handleCodeRun(result: RunResult) {
    // A timeout / Stop isn't a real run for gating purposes.
    if (result.timedOut || result.stopped) return;
    setRunCount((c) => c + 1);
    setLastRun({
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
    });
  }

  // Free navigation — lets the student flip through questions without
  // answering them. Landing on a question that already has a counted
  // attempt shows it read-only; landing on an unanswered one resets to a
  // blank slate.
  function goTo(target: number) {
    if (target < 0 || target >= questions.length) return;
    const q = questions[target];
    const prior = attemptByQuestion[q.id];

    setCurrentIdx(target);
    setSubmitting(false);
    setRerun(false);

    if (prior) {
      setFeedback(prior.isCorrect === null ? "submitted" : "correct");
      setAnswer(prior.answer ?? "");
      setSelectedChoice(Number(prior.answer) || 0);
      setCode(prior.code ?? prior.answer ?? "");
      setRunCount(prior.runCount ?? 1);
      setLastRun({
        stdout: prior.stdout ?? "",
        stderr: prior.stderr ?? "",
        durationMs: prior.durationMs ?? 0,
      });
    } else {
      setFeedback("idle");
      setAnswer("");
      setSelectedChoice(0);
      setCode(q.starterCode ?? "");
      setRunCount(0);
      setLastRun(null);
    }
    questionStartTime.current = Date.now();
  }

  async function handleSubmit() {
    if (!user || submitting) return;
    const question = questions[currentIdx];
    if (question.type === "code_exercise" && runCount === 0) return;
    setSubmitting(true);

    const timeSpentMs = Date.now() - questionStartTime.current;

    let answerValue: string;
    let isCorrect: boolean | null;
    let extra: Record<string, unknown> = {};

    if (question.type === "multiple_choice") {
      answerValue = String(selectedChoice);
      isCorrect = grade(question, answerValue);
    } else if (question.type === "code_exercise") {
      answerValue = code;
      const stdout = lastRun?.stdout ?? "";
      isCorrect = gradeCodeExercise(question, stdout);
      extra = {
        code,
        stdout,
        stderr: lastRun?.stderr ?? "",
        runCount,
        ...(lastRun ? { durationMs: lastRun.durationMs } : {}),
      };
    } else {
      answerValue = answer;
      isCorrect = grade(question, answerValue);
    }

    const attemptRef = await addDoc(
      collection(db, "submissions", subId, "attempts"),
      {
        questionId: question.id,
        answer: answerValue,
        isCorrect,
        gradedManually: null,
        timeSpentMs,
        createdAt: serverTimestamp(),
        ...extra,
      }
    );

    const newFeedback: Feedback =
      isCorrect === null ? "submitted" : isCorrect ? "correct" : "incorrect";
    setFeedback(newFeedback);

    if (isCorrect === true || isCorrect === null) {
      setAttemptByQuestion((prev) => ({
        ...prev,
        [question.id]: {
          id: attemptRef.id,
          questionId: question.id,
          answer: answerValue,
          isCorrect,
          gradedManually: null,
          timeSpentMs,
          createdAt: Timestamp.now(),
          ...extra,
        } as Attempt,
      }));

      const newDone = new Set(doneIds);
      newDone.add(question.id);

      const newAutoScore = [...newDone].filter((qid) => {
        const q = questions.find((q) => q.id === qid);
        return q && isAutoGradable(q);
      }).length;

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

  if (loading)
    return (
      <Container width="wide">
        <LoadingState />
      </Container>
    );

  if (allDone) {
    return (
      <Container width="wide">
        <PageHeader
          title="Assignment complete"
          backHref="/student"
          backLabel="Assignments"
        />
        <Card padding="lg" className="border-success bg-success-soft text-center">
          <p className="text-lg font-semibold text-success">
            Assignment complete
          </p>
          <p className="mt-2 text-ink">
            Auto score: {autoScore}/{totalAutoGradable}
          </p>
          {finalScore && finalScore.total > finalScore.totalAutoGradable && (
            <p className="mt-1 text-ink">
              Overall score: {finalScore.achieved}/{finalScore.total}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(`/student/assignments/${id}/review`)}
            >
              View your answers
            </Button>
            <Button onClick={() => router.push("/student")}>
              ← Back to assignments
            </Button>
          </div>
        </Card>
      </Container>
    );
  }

  const question = questions[currentIdx];
  const inputDisabled = feedback !== "idle" || submitting;
  const codeLocked = feedback === "correct" || feedback === "submitted";

  return (
    <Container width="wide">
      <PageHeader
        title={`Question ${currentIdx + 1} of ${questions.length}`}
        backHref="/student"
        backLabel="Assignments"
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={currentIdx === 0}
              onClick={() => goTo(currentIdx - 1)}
            >
              ← Previous
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={currentIdx === questions.length - 1}
              onClick={() => goTo(currentIdx + 1)}
            >
              Next →
            </Button>
          </>
        }
      />

      <Card padding="lg" className="space-y-4">
        <p className="whitespace-pre-wrap font-medium text-ink">
          {question.prompt}
        </p>

        {/* Code display */}
        {question.type === "type_output" || question.type === "fill_blank" ? (
          <pre className="whitespace-pre-wrap rounded bg-canvas p-3 font-mono text-sm text-ink">
            {question.code}
          </pre>
        ) : question.type === "fake_compiler" ? (
          <pre className="whitespace-pre-wrap rounded bg-code-bg p-3 font-mono text-sm text-code-fg">
            {question.code}
          </pre>
        ) : null}

        {/* Answer input */}
        {question.type === "code_exercise" ? (
          codeLocked ? (
            <div className="space-y-2">
              <PythonEditor value={code} readOnly />
              <OutputPanel
                stdout={lastRun?.stdout ?? ""}
                stderr={lastRun?.stderr ?? ""}
                status="idle"
              />
              {rerun ? (
                <CodeRunner
                  key={`rerun-${question.id}`}
                  initialCode={code}
                  stdin={question.stdinInput}
                  showStdin={false}
                  readOnly
                  autoRun
                />
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setRerun(true)}>
                  Re-run
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <CodeRunner
                key={question.id}
                initialCode={question.starterCode ?? ""}
                stdin={question.stdinInput}
                onCodeChange={setCode}
                onRun={handleCodeRun}
              />
              {feedback === "idle" && runCount === 0 && (
                <p className="text-xs text-ink-muted">
                  Run your code at least once before submitting.
                </p>
              )}
            </div>
          )
        ) : question.type === "multiple_choice" && question.choices ? (
          <fieldset className="space-y-2">
            {question.choices.map((choice, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-center gap-3"
              >
                <input
                  type="radio"
                  name="choice"
                  value={i}
                  checked={selectedChoice === i}
                  onChange={() => setSelectedChoice(i)}
                  disabled={inputDisabled}
                  className="accent-brand"
                />
                <span className="text-sm text-ink">{choice}</span>
              </label>
            ))}
          </fieldset>
        ) : question.type === "free_text" ? (
          <Textarea
            autoGrow
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={inputDisabled}
            rows={4}
            placeholder="Your answer…"
          />
        ) : question.type === "fill_blank" ? (
          <Input
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
          />
        ) : (
          // type_output / fake_compiler — multi-line so predictions can
          // include ASCII art, not just a single line of text.
          <Textarea
            autoGrow
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={inputDisabled}
            rows={4}
            className="font-mono text-sm"
            placeholder="Your answer…"
          />
        )}

        {/* Feedback */}
        {feedback === "correct" && (
          <Alert tone="success">Correct!</Alert>
        )}
        {feedback === "incorrect" && (
          <Alert tone="danger">Incorrect — try again.</Alert>
        )}
        {feedback === "submitted" && (
          <Alert tone="info">Answer submitted for review.</Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {feedback === "idle" && (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              loadingLabel="Submitting…"
              disabled={question.type === "code_exercise" && runCount === 0}
            >
              Submit
            </Button>
          )}
          {(feedback === "correct" || feedback === "submitted") && (
            <Button onClick={() => goTo(currentIdx + 1)}>Next →</Button>
          )}
          {feedback === "incorrect" && (
            <Button
              variant="secondary"
              onClick={() => {
                setFeedback("idle");
              }}
            >
              Try again
            </Button>
          )}
        </div>
      </Card>
    </Container>
  );
}
