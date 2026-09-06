"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getScoreSummary, ScoreSummary } from "@/lib/scoring";
import type { Assignment } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

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
      // No orderBy here — combining it with the equality filter below would
      // require a composite index. Sort client-side instead.
      const snap = await getDocs(
        query(collection(db, "assignments"), where("published", "==", true))
      );
      const assignments = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Assignment)
        .sort(
          (a, b) =>
            (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
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

  if (loading)
    return (
      <Container width="narrow">
        <LoadingState />
      </Container>
    );

  return (
    <Container width="narrow">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Your Assignments</h1>
      {rows.length === 0 ? (
        <EmptyState title="No assignments yet." />
      ) : (
        <ul className="space-y-3">
          {rows.map(({ assignment, score }) => {
            const status = score.submission?.status ?? null;
            const hasFreeText = score.total > score.totalAutoGradable;
            return (
              <li key={assignment.id}>
                <Card
                  as="button"
                  interactive
                  onClick={() =>
                    router.push(`/student/assignments/${assignment.id}`)
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-ink">
                        {assignment.title}
                      </p>
                      {assignment.description && (
                        <p className="mt-0.5 text-sm text-ink-muted">
                          {assignment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {status === null && (
                        <Badge tone="neutral">Not started</Badge>
                      )}
                      {status === "in_progress" && (
                        <>
                          <Badge tone="warning">In progress</Badge>
                          <span className="text-xs text-ink-muted">
                            Auto: {score.autoScore}/{score.totalAutoGradable}
                          </span>
                          {hasFreeText && (
                            <span className="text-xs text-ink-muted">
                              Overall: {score.achieved}/{score.total}
                            </span>
                          )}
                        </>
                      )}
                      {status === "completed" && (
                        <>
                          <Badge tone="success">Completed</Badge>
                          <span className="text-xs text-ink-muted">
                            Auto: {score.autoScore}/{score.totalAutoGradable}
                          </span>
                          {hasFreeText && (
                            <span className="text-xs text-ink-muted">
                              Overall: {score.achieved}/{score.total}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
