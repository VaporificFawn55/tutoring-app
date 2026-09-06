"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";

export default function NewAssignmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const ref = await addDoc(collection(db, "assignments"), {
        title: title.trim(),
        description: description.trim(),
        published: false,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      router.push(`/teacher/assignments/${ref.id}`);
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <Container width="narrow">
      <PageHeader
        title="New Assignment"
        backHref="/teacher"
        backLabel="Assignments"
      />

      <form onSubmit={handleSubmit} className="space-y-4">
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
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex gap-3">
          <Button type="submit" loading={saving} loadingLabel="Saving…">
            Create Assignment
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/teacher")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Container>
  );
}
