"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAllLessons } from "@/lib/lessons";
import type { Lesson } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TeacherLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLessons(await getAllLessons());
      setLoading(false);
    }
    load();
  }, []);

  async function togglePublish(l: Lesson) {
    const published = !(l.published === true);
    await updateDoc(doc(db, "lessons", l.id), { published });
    setLessons((prev) =>
      prev.map((x) => (x.id === l.id ? { ...x, published } : x))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this lesson?")) return;
    await deleteDoc(doc(db, "lessons", id));
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <Container>
      <PageHeader
        title="Lessons"
        actions={
          <Button onClick={() => router.push("/teacher/lessons/new")}>
            New Lesson
          </Button>
        }
      />

      {loading && <LoadingState />}

      {!loading && lessons.length === 0 && (
        <EmptyState
          title="No lessons yet."
          description="Create one to get started."
        />
      )}

      <ul className="space-y-2">
        {lessons.map((l) => (
          <Card
            key={l.id}
            as="li"
            padding="sm"
            className="flex items-center justify-between"
          >
            <span className="text-ink">
              {l.title}
              <Badge
                tone={l.published === true ? "success" : "neutral"}
                className="ml-2"
              >
                {l.published === true ? "Published" : "Draft"}
              </Badge>
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => togglePublish(l)}>
                {l.published === true ? "Un-publish" : "Publish"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-brand"
                onClick={() => router.push(`/teacher/lessons/${l.id}`)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger"
                onClick={() => handleDelete(l.id)}
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
