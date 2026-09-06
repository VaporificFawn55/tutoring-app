"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, Question } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";

export default function AssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Edit form state — pre-filled once assignment loads
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    async function load() {
      const aSnap = await getDoc(doc(db, "assignments", id));
      if (!aSnap.exists()) {
        router.replace("/teacher");
        return;
      }
      const a = { id: aSnap.id, ...aSnap.data() } as Assignment;
      setTitle(a.title);
      setDescription(a.description);

      const qSnap = await getDocs(
        query(
          collection(db, "assignments", id, "questions"),
          orderBy("order")
        )
      );
      setQuestions(
        qSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
      );
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveError("");
    try {
      await updateDoc(doc(db, "assignments", id), {
        title: title.trim(),
        description: description.trim(),
      });
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveError("Failed to save.");
    }
    setSaving(false);
  }

  async function handleDeleteQuestion(qid: string) {
    if (!confirm("Delete this question?")) return;
    await deleteDoc(doc(db, "assignments", id, "questions", qid));
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
  }

  if (loading)
    return (
      <Container width="narrow">
        <LoadingState />
      </Container>
    );

  return (
    <Container width="narrow" className="space-y-8">
      <PageHeader
        title="Edit Assignment"
        backHref="/teacher"
        backLabel="Assignments"
      />

      {/* Assignment form */}
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Title">
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Description">
          <Textarea
            autoGrow
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        {saveError && <Alert tone="danger">{saveError}</Alert>}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} loadingLabel="Saving…">
            Save Changes
          </Button>
          {saveMsg && (
            <span className="text-sm text-success">{saveMsg}</span>
          )}
        </div>
      </form>

      {/* Questions */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Questions</h2>
          <Button
            size="sm"
            onClick={() =>
              router.push(`/teacher/assignments/${id}/questions/new`)
            }
          >
            Add Question
          </Button>
        </div>

        {questions.length === 0 ? (
          <EmptyState title="No questions yet." />
        ) : (
          <ul className="space-y-2">
            {questions.map((q) => (
              <Card
                key={q.id}
                as="li"
                padding="sm"
                className="flex items-start justify-between"
              >
                <div className="min-w-0">
                  <span className="mr-2 text-xs text-ink-subtle">
                    #{q.order}
                  </span>
                  <Badge className="mr-2 uppercase">{q.type}</Badge>
                  <span className="break-words text-sm text-ink">
                    {q.prompt}
                  </span>
                </div>
                <div className="ml-4 flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-brand"
                    onClick={() =>
                      router.push(
                        `/teacher/assignments/${id}/questions/${q.id}`
                      )
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => handleDeleteQuestion(q.id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
