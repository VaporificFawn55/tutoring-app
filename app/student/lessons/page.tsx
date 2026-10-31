"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublishedLessons } from "@/lib/lessons";
import type { Lesson } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";

export default function StudentLessonsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLessons(await getPublishedLessons());
      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <Container width="narrow">
        <LoadingState />
      </Container>
    );

  return (
    <Container width="narrow">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Lessons</h1>
      {lessons.length === 0 ? (
        <EmptyState title="No lessons yet." />
      ) : (
        <ul className="space-y-3">
          {lessons.map((l) => (
            <li key={l.id}>
              <Card
                as="button"
                interactive
                onClick={() => router.push(`/student/lessons/${l.id}`)}
                className="w-full text-left"
              >
                <p className="font-medium text-ink">{l.title}</p>
                {l.summary && (
                  <p className="mt-0.5 text-sm text-ink-muted">{l.summary}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
