"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { getAllLessons } from "@/lib/lessons";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";

export default function NewLessonPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const existing = await getAllLessons();
      const nextOrder =
        existing.reduce((max, l) => Math.max(max, l.order), 0) + 1;
      const ref = await addDoc(collection(db, "lessons"), {
        title: title.trim(),
        summary: summary.trim(),
        order: nextOrder,
        blocks: [],
        published: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      router.push(`/teacher/lessons/${ref.id}`);
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <Container width="narrow">
      <PageHeader
        title="New Lesson"
        backHref="/teacher/lessons"
        backLabel="Lessons"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Title">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Summary">
          <Textarea
            autoGrow
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex gap-3">
          <Button type="submit" loading={saving} loadingLabel="Saving…">
            Create Lesson
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/teacher/lessons")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Container>
  );
}
