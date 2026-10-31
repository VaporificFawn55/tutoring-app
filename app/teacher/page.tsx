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
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TeacherDashboard() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this assignment and all its questions?")) return;
    const qSnap = await getDocs(
      collection(db, "assignments", id, "questions")
    );
    await Promise.all(qSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "assignments", id));
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  }

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

      {loading && <LoadingState />}

      {!loading && assignments.length === 0 && (
        <EmptyState
          title="No assignments yet."
          description="Create one to get started."
        />
      )}

      <ul className="space-y-2">
        {assignments.map((a) => (
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
