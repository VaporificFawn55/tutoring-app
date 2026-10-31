"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getScoreSummary, getStudentUid, ScoreSummary } from "@/lib/scoring";
import type { Assignment, Attempt, Question } from "@/lib/types";
import { OutputPanel } from "@/components/code/OutputPanel";
import { PythonEditor } from "@/components/code/PythonEditor";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

type QuestionWithAnswer = {
  question: Question;
  latest: Attempt | null;
};

export default function AssignmentReviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, role } = useAuth();
  const previewing = role === "teacher";

  const [loading, setLoading] = useState(true);
  const [noStudent, setNoStudent] = useState(false);
  const [notStarted, setNotStarted] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [rows, setRows] = useState<QuestionWithAnswer[]>([]);
  const [score, setScore] = useState<ScoreSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      // A previewing teacher reviews the real student's data, read-only.
      const targetUid = previewing ? await getStudentUid() : user!.uid;
      if (!targetUid) {
        setNoStudent(true);
        setLoading(false);
        return;
      }

      const subId = `${targetUid}_${id}`;
      const [aSnap, qSnap, subSnap] = await Promise.all([
        getDoc(doc(db, "assignments", id)),
        getDocs(
          query(collection(db, "assignments", id, "questions"), orderBy("order"))
        ),
        getDoc(doc(db, "submissions", subId)),
      ]);

      if (!aSnap.exists()) {
        router.replace("/student");
        return;
      }

      setAssignment({ id: aSnap.id, ...aSnap.data() } as Assignment);
      const questions = qSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Question
      );

      if (!subSnap.exists()) {
        setNotStarted(true);
        setRows(questions.map((question) => ({ question, latest: null })));
        setLoading(false);
        return;
      }

      const attSnap = await getDocs(
        query(collection(db, "submissions", subId, "attempts"), orderBy("createdAt"))
      );
      const latestByQuestion = new Map<string, Attempt>();
      attSnap.docs.forEach((d) => {
        latestByQuestion.set(d.data().questionId as string, {
          id: d.id,
          ...d.data(),
        } as Attempt);
      });

      setRows(
        questions.map((question) => ({
          question,
          latest: latestByQuestion.get(question.id) ?? null,
        }))
      );
      setScore(await getScoreSummary(id, targetUid));
      setLoading(false);
    }
    load();
  }, [user, previewing, id, router]);

  if (loading)
    return (
      <Container width="wide">
        <LoadingState />
      </Container>
    );

  if (noStudent)
    return (
      <Container width="wide">
        <Alert tone="warning">No student account found yet.</Alert>
      </Container>
    );

  return (
    <Container width="wide" className="space-y-6">
      <PageHeader
        title={`Review: ${assignment?.title ?? ""}`}
        backHref="/student"
        backLabel="Assignments"
      />

      {notStarted && (
        <EmptyState title="Not started yet." description="No answers to show." />
      )}

      {score && (
        <Card className="flex gap-8">
          <div>
            <p className="text-xs text-ink-muted">Auto score</p>
            <p className="font-medium text-ink">
              {score.autoScore}/{score.totalAutoGradable}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Overall score</p>
            <p className="font-medium text-ink">
              {score.achieved}/{score.total}
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {!notStarted && rows.map(({ question, latest }, i) => (
          <Card key={question.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-ink">
                <span className="mr-2 text-xs text-ink-subtle">Q{i + 1}</span>
                {question.prompt}
              </p>
              <StatusBadge attempt={latest} />
            </div>

            {(question.type === "type_output" ||
              question.type === "fill_blank" ||
              question.type === "fake_compiler") &&
              question.code && (
                <pre className="whitespace-pre-wrap rounded bg-canvas p-3 font-mono text-xs text-ink">
                  {question.code}
                </pre>
              )}

            {!latest ? (
              <p className="text-sm text-ink-subtle">Not answered yet.</p>
            ) : question.type === "code_exercise" ? (
              <div className="space-y-2">
                <PythonEditor value={latest.code ?? latest.answer ?? ""} readOnly />
                <OutputPanel
                  stdout={latest.stdout ?? ""}
                  stderr={latest.stderr ?? ""}
                  status="idle"
                />
              </div>
            ) : question.type === "multiple_choice" && question.choices ? (
              <p className="rounded border border-border bg-canvas px-3 py-2 text-sm text-ink">
                {question.choices[Number(latest.answer)] ?? latest.answer}
              </p>
            ) : (
              <p className="whitespace-pre-wrap rounded border border-border bg-canvas px-3 py-2 text-sm text-ink">
                {latest.answer}
              </p>
            )}

            {latest?.feedback && (
              <p className="text-sm text-ink-muted">
                <span className="font-medium text-ink">Feedback: </span>
                {latest.feedback}
              </p>
            )}
          </Card>
        ))}
      </div>
    </Container>
  );
}

function StatusBadge({ attempt }: { attempt: Attempt | null }) {
  if (!attempt) return <Badge tone="neutral">Not answered</Badge>;
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
