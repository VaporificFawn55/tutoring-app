"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  collection,
  getDoc,
  getDocs,
  doc,
  query,
  orderBy,
  DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStudentUid } from "@/lib/scoring";
import { gradeAttempt } from "@/lib/grading";
import type { Assignment, Attempt, Question, Submission } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { OutputPanel } from "@/components/code/OutputPanel";
import { PythonEditor } from "@/components/code/PythonEditor";

type AttemptRow = {
  ref: DocumentReference;
  attempt: Attempt;
};

type QuestionWithAttempts = {
  question: Question;
  attempts: AttemptRow[];
};

export default function AssignmentGradingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rows, setRows] = useState<QuestionWithAttempts[]>([]);
  const [noStudent, setNoStudent] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});

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
      const attempts: AttemptRow[] = attSnap.docs.map((d) => ({
        ref: d.ref,
        attempt: { id: d.id, ...d.data() } as Attempt,
      }));

      setRows(
        questions.map((q) => ({
          question: q,
          attempts: attempts.filter((a) => a.attempt.questionId === q.id),
        }))
      );
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function grade(row: AttemptRow, correct: boolean) {
    setGradingId(row.attempt.id);
    const feedback = feedbackDraft[row.attempt.id];
    await gradeAttempt(row.ref, { correct, feedback });
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        attempts: r.attempts.map((a) =>
          a.attempt.id === row.attempt.id
            ? {
                ...a,
                attempt: {
                  ...a.attempt,
                  gradedManually: correct,
                  ...(feedback !== undefined ? { feedback } : {}),
                },
              }
            : a
        ),
      }))
    );
    setGradingId(null);
  }

  if (loading)
    return (
      <Container>
        <LoadingState />
      </Container>
    );

  const totalQuestions = rows.length;
  const gradedCorrect = rows.reduce(
    (sum, r) => sum + r.attempts.filter((a) => a.attempt.gradedManually === true).length,
    0
  );
  const achieved = (submission?.autoScore ?? 0) + gradedCorrect;

  return (
    <Container className="space-y-6">
      <PageHeader
        title="Grading"
        backHref={`/teacher/assignments/${id}`}
        backLabel={assignment?.title ?? "Assignment"}
      />

      {noStudent && (
        <Alert tone="warning">No student account found yet.</Alert>
      )}

      {!noStudent && !submission && <LoadingState label="Not started." />}

      {submission && (
        <Card className="flex gap-8">
          <div>
            <p className="text-xs text-ink-muted">Status</p>
            <p className="font-medium capitalize text-ink">
              {submission.status.replace("_", " ")}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Auto score</p>
            <p className="font-medium text-ink">
              {submission.autoScore}/{submission.totalAutoGradable}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Overall score</p>
            <p className="font-medium text-ink">
              {achieved}/{totalQuestions}
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {rows.map(({ question, attempts }, i) => (
          <Card key={question.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-medium text-ink">
                <span className="mr-2 text-xs text-ink-subtle">Q{i + 1}</span>
                {question.prompt}
              </p>
              <Badge className="shrink-0 uppercase">{question.type}</Badge>
            </div>

            {attempts.length === 0 ? (
              <p className="text-sm text-ink-subtle">Not attempted.</p>
            ) : (
              <ul className="space-y-3">
                {attempts.map((row, idx) => {
                  const a = row.attempt;
                  const pending = a.isCorrect === null && a.gradedManually === null;
                  return (
                    <li
                      key={a.id}
                      className="space-y-2 border-t border-border pt-2 first:border-0 first:pt-0"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-ink-muted">
                          <span className="mr-2 text-xs text-ink-subtle">
                            #{idx + 1}
                          </span>
                          {question.type !== "code_exercise" && (
                            <>&ldquo;{a.answer}&rdquo;</>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <StatusBadge attempt={a} />
                          <span className="text-xs text-ink-subtle">
                            {(a.timeSpentMs / 1000).toFixed(1)}s
                          </span>
                          <span className="text-xs text-ink-subtle">
                            {a.createdAt?.toDate
                              ? a.createdAt.toDate().toLocaleString()
                              : ""}
                          </span>
                        </span>
                      </div>

                      {question.type === "code_exercise" && (
                        <div className="space-y-2">
                          <PythonEditor value={a.code ?? ""} readOnly />
                          <OutputPanel
                            stdout={a.stdout ?? ""}
                            stderr={a.stderr ?? ""}
                            status="idle"
                          />
                        </div>
                      )}

                      {pending && (
                        <div className="space-y-2 rounded-md bg-canvas p-3">
                          <Field label="Feedback (optional, shown to student)">
                            <Textarea
                              rows={2}
                              value={feedbackDraft[a.id] ?? a.feedback ?? ""}
                              onChange={(e) =>
                                setFeedbackDraft((prev) => ({
                                  ...prev,
                                  [a.id]: e.target.value,
                                }))
                              }
                              className="text-sm"
                            />
                          </Field>
                          <div className="flex gap-3">
                            <Button
                              size="sm"
                              variant="success"
                              disabled={gradingId === a.id}
                              onClick={() => grade(row, true)}
                            >
                              Correct
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={gradingId === a.id}
                              onClick={() => grade(row, false)}
                            >
                              Incorrect
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </Container>
  );
}

function StatusBadge({ attempt }: { attempt: Attempt }) {
  if (attempt.isCorrect === null) {
    if (attempt.gradedManually === true) {
      return <Badge tone="success">Correct</Badge>;
    }
    if (attempt.gradedManually === false) {
      return <Badge tone="danger">Incorrect</Badge>;
    }
    return <Badge tone="warning">Pending review</Badge>;
  }
  return attempt.isCorrect ? (
    <Badge tone="success">Correct</Badge>
  ) : (
    <Badge tone="danger">Incorrect</Badge>
  );
}
