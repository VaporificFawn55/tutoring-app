"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, getDoc, getDocs, doc, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getStudentUid } from "@/lib/scoring";
import type { Assignment, Attempt, Question, Submission } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

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

  if (loading)
    return (
      <Container>
        <LoadingState />
      </Container>
    );

  const totalQuestions = rows.length;
  const gradedCorrect = rows.reduce(
    (sum, r) => sum + r.attempts.filter((a) => a.gradedManually === true).length,
    0
  );
  const achieved = (submission?.autoScore ?? 0) + gradedCorrect;

  return (
    <Container className="space-y-6">
      <PageHeader
        title="Student Progress"
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
              <ul className="space-y-1.5">
                {attempts.map((a, idx) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 border-t border-border pt-1.5 text-sm first:border-0 first:pt-0"
                  >
                    <span className="truncate text-ink-muted">
                      <span className="mr-2 text-xs text-ink-subtle">
                        #{idx + 1}
                      </span>
                      &ldquo;{a.answer}&rdquo;
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
                  </li>
                ))}
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
