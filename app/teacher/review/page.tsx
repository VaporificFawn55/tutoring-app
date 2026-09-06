"use client";

import { useEffect, useState } from "react";
import {
  collectionGroup,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Attempt, Submission } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

type PendingItem = {
  attemptRef: DocumentReference;
  attempt: Attempt;
  assignmentTitle: string;
  questionPrompt: string;
};

export default function ReviewQueuePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [gradingId, setGradingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // No `where` filter here on purpose — a filtered collectionGroup query
      // needs an explicit collection-group index; a plain fetch doesn't.
      // Volume is low for a single-student app, so filtering client-side is fine.
      const snap = await getDocs(collectionGroup(db, "attempts"));
      const pending = snap.docs.filter((d) => {
        const data = d.data();
        return data.isCorrect === null && data.gradedManually === null;
      });

      const assignmentCache = new Map<string, string>();
      const questionCache = new Map<string, string>();

      const resolved = await Promise.all(
        pending.map(async (attemptDoc) => {
          const attempt = {
            id: attemptDoc.id,
            ...attemptDoc.data(),
          } as Attempt;
          const subRef = attemptDoc.ref.parent.parent;
          if (!subRef) return null;
          const subSnap = await getDoc(subRef);
          if (!subSnap.exists()) return null;
          const submission = subSnap.data() as Omit<Submission, "id">;
          const assignmentId = submission.assignmentId;

          let assignmentTitle = assignmentCache.get(assignmentId);
          if (!assignmentTitle) {
            const aSnap = await getDoc(doc(db, "assignments", assignmentId));
            assignmentTitle = aSnap.exists()
              ? (aSnap.data().title as string)
              : "Unknown assignment";
            assignmentCache.set(assignmentId, assignmentTitle);
          }

          const qKey = `${assignmentId}/${attempt.questionId}`;
          let questionPrompt = questionCache.get(qKey);
          if (!questionPrompt) {
            const qSnap = await getDoc(
              doc(
                db,
                "assignments",
                assignmentId,
                "questions",
                attempt.questionId
              )
            );
            questionPrompt = qSnap.exists()
              ? (qSnap.data().prompt as string)
              : "Unknown question";
            questionCache.set(qKey, questionPrompt);
          }

          return {
            attemptRef: attemptDoc.ref,
            attempt,
            assignmentTitle,
            questionPrompt,
          } as PendingItem;
        })
      );

      setItems(
        resolved
          .filter((r): r is PendingItem => r !== null)
          .sort(
            (a, b) =>
              (a.attempt.createdAt?.toMillis?.() ?? 0) -
              (b.attempt.createdAt?.toMillis?.() ?? 0)
          )
      );
      setLoading(false);
    }
    load();
  }, []);

  async function grade(item: PendingItem, correct: boolean) {
    setGradingId(item.attempt.id);
    await updateDoc(item.attemptRef, { gradedManually: correct });
    setItems((prev) => prev.filter((i) => i.attempt.id !== item.attempt.id));
    setGradingId(null);
  }

  if (loading)
    return (
      <Container>
        <LoadingState />
      </Container>
    );

  return (
    <Container className="space-y-6">
      <PageHeader title="Review Queue" />

      {items.length === 0 && (
        <EmptyState title="No free-text answers awaiting review." />
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <Card key={item.attempt.id} as="li" className="space-y-3">
            <div>
              <p className="text-xs text-ink-muted">{item.assignmentTitle}</p>
              <p className="font-medium text-ink">{item.questionPrompt}</p>
            </div>
            <p className="whitespace-pre-wrap rounded border border-border bg-canvas px-3 py-2 text-sm text-ink">
              {item.attempt.answer}
            </p>
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
