"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPendingAttempts } from "@/lib/grading";
import type { Assignment } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

type Tab = "active" | "completed";

export default function TeacherDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");

  useEffect(() => {
    async function load() {
      const [aSnap, pending] = await Promise.all([
        getDocs(query(collection(db, "assignments"), orderBy("createdAt"))),
        getPendingAttempts(),
      ]);
      setAssignments(
        aSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Assignment)
      );
      setNeedsReviewCount(pending.length);
      setLoading(false);
    }
    load();
  }, []);

  async function togglePublish(a: Assignment) {
    const published = !(a.published === true);
    await updateDoc(doc(db, "assignments", a.id), { published });
    setAssignments((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, published } : x))
    );
  }

  async function toggleArchived(a: Assignment) {
    const archived = !(a.archived === true);
    await updateDoc(doc(db, "assignments", a.id), { archived });
    setAssignments((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, archived } : x))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this assignment and all its questions?")) return;
    const qSnap = await getDocs(
      collection(db, "assignments", id, "questions")
    );
    await Promise.all(qSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "assignments", id));
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

  const active = assignments.filter((a) => a.archived !== true);
  const completed = assignments.filter((a) => a.archived === true);
  const visible = tab === "active" ? active : completed;

  return (
    <Container>
      <PageHeader
        title="Assignments"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => router.push("/teacher/grading")}
            >
              Grading
              {needsReviewCount > 0 && (
                <Badge tone="warning" className="ml-2">
                  {needsReviewCount}
                </Badge>
              )}
            </Button>
            <Button onClick={() => router.push("/teacher/assignments/new")}>
              New Assignment
            </Button>
          </>
        }
      />

      <div className="mb-4 flex gap-5 border-b border-border">
        {([
          ["active", "Active", active.length],
          ["completed", "Completed", completed.length],
        ] as [Tab, string, number][]).map(([t, label, count]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "border-b-2 px-0.5 pb-2 text-sm font-medium",
              tab === t
                ? "border-brand text-ink"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 text-xs text-ink-subtle">{count}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <LoadingState />}

      {!loading && visible.length === 0 && (
        <EmptyState
          title={
            tab === "active" ? "No assignments yet." : "Nothing completed yet."
          }
          description={tab === "active" ? "Create one to get started." : undefined}
        />
      )}

      <ul className="space-y-2">
        {visible.map((a) => (
          <Card
            key={a.id}
            as="li"
            padding="sm"
            className="flex items-center justify-between"
          >
            <span className="text-ink">
              {a.title}
              <Badge
                tone={a.published === true ? "success" : "neutral"}
                className="ml-2"
              >
                {a.published === true ? "Published" : "Draft"}
              </Badge>
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => togglePublish(a)}
              >
                {a.published === true ? "Un-publish" : "Publish"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/teacher/grading/${a.id}`)}
              >
                Grade
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-brand"
                onClick={() => router.push(`/teacher/assignments/${a.id}`)}
              >
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleArchived(a)}>
                {a.archived === true ? "Restore" : "Mark Completed"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                onClick={() => handleDelete(a.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </ul>
    </Container>
  );
}
