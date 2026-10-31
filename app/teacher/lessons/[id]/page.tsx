"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { moveBlock, newCodeBlock, newTextBlock } from "@/lib/lessons";
import type { Lesson, LessonBlock } from "@/lib/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";

export default function LessonEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [order, setOrder] = useState(1);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, "lessons", id));
      if (!snap.exists()) {
        router.replace("/teacher/lessons");
        return;
      }
      const l = { id: snap.id, ...snap.data() } as Lesson;
      setTitle(l.title);
      setSummary(l.summary);
      setOrder(l.order);
      setBlocks(l.blocks ?? []);
      setPublished(l.published === true);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function togglePublish() {
    const next = !published;
    await updateDoc(doc(db, "lessons", id), { published: next });
    setPublished(next);
  }

  function updateBlock(index: number, next: LessonBlock) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? next : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaveMsg("");
    try {
      await updateDoc(doc(db, "lessons", id), {
        title: title.trim(),
        summary: summary.trim(),
        order: Number(order),
        blocks,
        updatedAt: serverTimestamp(),
      });
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setError("Failed to save.");
    }
    setSaving(false);
  }

  if (loading)
    return (
      <Container width="default">
        <LoadingState />
      </Container>
    );

  return (
    <Container width="default" className="space-y-8">
      <PageHeader
        title="Edit Lesson"
        backHref="/teacher/lessons"
        backLabel="Lessons"
        actions={
          <Button variant="secondary" onClick={togglePublish}>
            {published ? "Un-publish" : "Publish"}
            <Badge tone={published ? "success" : "neutral"} className="ml-2">
              {published ? "Published" : "Draft"}
            </Badge>
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-8">
        <div className="space-y-4">
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
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </Field>
          <Field label="Order" hint="Position in the student's lesson library.">
            <Input
              type="number"
              required
              min={1}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-24"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-ink">Blocks</h2>

          {blocks.length === 0 && (
            <p className="text-sm text-ink-muted">
              No blocks yet — add one below.
            </p>
          )}

          {blocks.map((block, i) => (
            <Card key={i} padding="sm" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-ink-subtle">
                  {block.kind === "text" ? "Text" : "Code"}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => setBlocks((prev) => moveBlock(prev, i, -1))}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={i === blocks.length - 1}
                    onClick={() => setBlocks((prev) => moveBlock(prev, i, 1))}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    onClick={() => removeBlock(i)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {block.kind === "text" ? (
                <Textarea
                  autoGrow
                  rows={3}
                  value={block.text}
                  onChange={(e) =>
                    updateBlock(i, { kind: "text", text: e.target.value })
                  }
                  placeholder="Lesson text…"
                />
              ) : (
                <>
                  <Textarea
                    autoGrow
                    rows={5}
                    value={block.code}
                    onChange={(e) =>
                      updateBlock(i, { ...block, code: e.target.value })
                    }
                    className="font-mono text-xs leading-relaxed"
                    placeholder="print('hello')"
                  />
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={block.runnable}
                      onChange={(e) =>
                        updateBlock(i, { ...block, runnable: e.target.checked })
                      }
                      className="accent-brand"
                    />
                    Student can run this block
                  </label>
                </>
              )}
            </Card>
          ))}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBlocks((prev) => [...prev, newTextBlock()])}
            >
              + Text block
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBlocks((prev) => [...prev, newCodeBlock()])}
            >
              + Code block
            </Button>
          </div>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} loadingLabel="Saving…">
            Save Changes
          </Button>
          {saveMsg && <span className="text-sm text-success">{saveMsg}</span>}
        </div>
      </form>
    </Container>
  );
}
