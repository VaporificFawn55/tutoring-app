"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Question } from "@/lib/types";
import QuestionForm, { type QuestionPayload } from "@/components/QuestionForm";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function EditQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const qid = params.qid as string;

  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<Question | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);

  useEffect(() => {
    async function load() {
      const [qSnap, allSnap] = await Promise.all([
        getDoc(doc(db, "assignments", id, "questions", qid)),
        getDocs(
          query(
            collection(db, "assignments", id, "questions"),
            orderBy("order")
          )
        ),
      ]);

      if (!qSnap.exists()) {
        router.replace(`/teacher/assignments/${id}`);
        return;
      }

      setQuestion({ id: qSnap.id, ...qSnap.data() } as Question);
      setAllQuestions(
        allSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question)
      );
      setLoading(false);
    }
    load();
  }, [id, qid, router]);

  async function handleSubmit(payload: QuestionPayload) {
    // Build the update, using deleteField() to remove optional fields
    // that don't belong to the new type — prevents stale data from a prior type.
    const update: Record<string, unknown> = {
      type: payload.type,
      order: payload.order,
      prompt: payload.prompt,
      manualGrade: payload.manualGrade,
      code: payload.code !== undefined ? payload.code : deleteField(),
      correctAnswer:
        payload.correctAnswer !== undefined
          ? payload.correctAnswer
          : deleteField(),
      choices: payload.choices !== undefined ? payload.choices : deleteField(),
      correctIndex:
        payload.correctIndex !== undefined
          ? payload.correctIndex
          : deleteField(),
      starterCode:
        payload.starterCode !== undefined
          ? payload.starterCode
          : deleteField(),
      expectedStdout:
        payload.expectedStdout !== undefined
          ? payload.expectedStdout
          : deleteField(),
      stdinInput:
        payload.stdinInput !== undefined ? payload.stdinInput : deleteField(),
    };
    await updateDoc(doc(db, "assignments", id, "questions", qid), update);
    router.push(`/teacher/assignments/${id}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this question?")) return;
    await deleteDoc(doc(db, "assignments", id, "questions", qid));
    router.push(`/teacher/assignments/${id}`);
  }

  if (loading)
    return (
      <Container width="narrow">
        <LoadingState />
      </Container>
    );
  if (!question) return null;

  return (
    <Container width="narrow">
      <PageHeader
        title="Edit Question"
        backHref={`/teacher/assignments/${id}`}
        backLabel="Assignment"
        actions={
          <Button variant="ghost" className="text-danger" onClick={handleDelete}>
            Delete
          </Button>
        }
      />

      <QuestionForm
        existingQuestions={allQuestions}
        currentQid={qid}
        defaultOrder={question.order}
        initialValues={{
          type: question.type,
          order: question.order,
          prompt: question.prompt,
          code: question.code,
          choices: question.choices,
          correctIndex: question.correctIndex,
          correctAnswer: question.correctAnswer,
          starterCode: question.starterCode,
          expectedStdout: question.expectedStdout,
          stdinInput: question.stdinInput,
          manualGrade: question.manualGrade,
        }}
        submitLabel="Save Changes"
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/teacher/assignments/${id}`)}
      />
    </Container>
  );
}
