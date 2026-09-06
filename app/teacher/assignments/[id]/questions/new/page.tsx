"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Question } from "@/lib/types";
import QuestionForm, { type QuestionPayload } from "@/components/QuestionForm";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [defaultOrder, setDefaultOrder] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(
        query(collection(db, "assignments", id, "questions"), orderBy("order"))
      );
      const qs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
      setQuestions(qs);
      const maxOrder = qs.reduce((max, q) => Math.max(max, q.order), 0);
      setDefaultOrder(maxOrder + 1);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(payload: QuestionPayload) {
    await addDoc(collection(db, "assignments", id, "questions"), payload);
    router.push(`/teacher/assignments/${id}`);
  }

  return (
    <Container width="narrow">
      <PageHeader
        title="Add Question"
        backHref={`/teacher/assignments/${id}`}
        backLabel="Assignment"
      />

      {loading ? (
        <LoadingState />
      ) : (
        <QuestionForm
          existingQuestions={questions}
          defaultOrder={defaultOrder}
          submitLabel="Add Question"
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/teacher/assignments/${id}`)}
        />
      )}
    </Container>
  );
}
