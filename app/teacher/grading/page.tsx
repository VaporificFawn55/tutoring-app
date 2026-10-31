"use client";

import { useEffect, useState } from "react";
import { getPendingAttempts, gradeAttempt, type PendingAttempt } from "@/lib/grading";
import { getGraderNotes, setGraderNote } from "@/lib/graderNotes";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { CodeRunner } from "@/components/code/CodeRunner";
import { OutputPanel } from "@/components/code/OutputPanel";
import { PythonEditor } from "@/components/code/PythonEditor";

export default function GradingInboxPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingAttempt[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [notesByAssignment, setNotesByAssignment] = useState<
    Record<string, Record<string, string>>
  >({});
  const [rerunId, setRerunId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const pending = await getPendingAttempts();
      setItems(pending);

      const assignmentIds = [...new Set(pending.map((p) => p.assignmentId))];
      const notesEntries = await Promise.all(
        assignmentIds.map(async (aid) => [aid, await getGraderNotes(aid)] as const)
      );
      setNotesByAssignment(Object.fromEntries(notesEntries));
      setLoading(false);
    }
    load();
  }, []);

  async function grade(item: PendingAttempt, correct: boolean) {
    setGradingId(item.attempt.id);
    await gradeAttempt(item.attemptRef, {
      correct,
      feedback: feedbackDraft[item.attempt.id],
    });
    setItems((prev) => prev.filter((i) => i.attempt.id !== item.attempt.id));
    setGradingId(null);
  }

  async function saveNote(item: PendingAttempt, text: string) {
    await setGraderNote(item.assignmentId, item.question.id, text);
    setNotesByAssignment((prev) => ({
      ...prev,
      [item.assignmentId]: { ...prev[item.assignmentId], [item.question.id]: text },
    }));
  }

  if (loading)
    return (
      <Container>
        <LoadingState />
      </Container>
    );

  return (
    <Container className="space-y-6">
      <PageHeader title="Grading" />

      {items.length === 0 && (
        <EmptyState title="Nothing waiting to be graded." />
      )}

      <ul className="space-y-4">
        {items.map((item) => (
          <Card key={item.attempt.id} as="li" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-ink-muted">{item.assignmentTitle}</p>
                <p className="font-medium text-ink">{item.question.prompt}</p>
              </div>
              <Badge className="shrink-0 uppercase">{item.question.type}</Badge>
            </div>

            {item.question.type === "code_exercise" ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-muted">
                    Submitted code
                  </p>
                  <PythonEditor value={item.attempt.code ?? ""} readOnly />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-muted">
                    Captured output
                  </p>
                  <OutputPanel
                    stdout={item.attempt.stdout ?? ""}
                    stderr={item.attempt.stderr ?? ""}
                    status="idle"
                  />
                </div>

                {rerunId === item.attempt.id ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-ink-muted">
                      Re-run
                    </p>
                    <CodeRunner
                      initialCode={item.attempt.code ?? ""}
                      stdin={item.question.stdinInput}
                      showStdin={false}
                      readOnly
                      autoRun
                    />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRerunId(item.attempt.id)}
                  >
                    Re-run
                  </Button>
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap rounded border border-border bg-canvas px-3 py-2 text-sm text-ink">
                {item.attempt.answer}
              </p>
            )}

            <Field label="Grader notes (private, never shown to student)">
              <Textarea
                rows={2}
                defaultValue={
                  notesByAssignment[item.assignmentId]?.[item.question.id] ?? ""
                }
                onBlur={(e) => saveNote(item, e.target.value)}
                className="text-sm"
              />
            </Field>

            <Field label="Feedback (optional, shown to student)">
              <Textarea
                rows={2}
                value={feedbackDraft[item.attempt.id] ?? item.attempt.feedback ?? ""}
                onChange={(e) =>
                  setFeedbackDraft((prev) => ({
                    ...prev,
                    [item.attempt.id]: e.target.value,
                  }))
                }
              />
            </Field>

            <div className="flex gap-3">
              <Button
                size="sm"
                variant="success"
                disabled={gradingId === item.attempt.id}
                onClick={() => grade(item, true)}
              >
                Correct
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={gradingId === item.attempt.id}
                onClick={() => grade(item, false)}
              >
                Incorrect
              </Button>
            </div>
          </Card>
        ))}
      </ul>
    </Container>
  );
}
