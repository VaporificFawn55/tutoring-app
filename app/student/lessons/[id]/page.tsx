"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Lesson } from "@/lib/types";
import { CodeRunner } from "@/components/code/CodeRunner";
import { PythonEditor } from "@/components/code/PythonEditor";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function LessonReaderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "lessons", id));
        if (!snap.exists() || snap.data().published !== true) {
          router.replace("/student/lessons");
          return;
        }
        setLesson({ id: snap.id, ...snap.data() } as Lesson);
      } catch {
        router.replace("/student/lessons");
        return;
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading || !lesson)
    return (
      <Container width="wide">
        <LoadingState />
      </Container>
    );

  return (
    <Container width="wide">
      <PageHeader
        title={lesson.title}
        backHref="/student/lessons"
        backLabel="Lessons"
      />

      <div className="space-y-6">
        {lesson.blocks.map((block, i) =>
          block.kind === "text" ? (
            <p key={i} className="whitespace-pre-wrap text-ink">
              {block.text}
            </p>
          ) : block.runnable ? (
            <CodeRunner key={i} initialCode={block.code} showStdin={false} />
          ) : (
            <PythonEditor key={i} value={block.code} readOnly />
          )
        )}
      </div>
    </Container>
  );
}
