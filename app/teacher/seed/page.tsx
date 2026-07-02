"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const SEED_QUESTIONS = [
  {
    type: "multiple_choice",
    order: 1,
    prompt: "Which of the following is a valid Python variable name?",
    choices: ["2name", "my_variable", "class", "for"],
    correctIndex: 1,
    manualGrade: false,
  },
  {
    type: "type_output",
    order: 2,
    prompt: "What does the following code print?",
    code: "x = 5\ny = 3\nprint(x + y)",
    correctAnswer: "8",
    manualGrade: false,
  },
  {
    type: "fill_blank",
    order: 3,
    prompt: "Complete the code so it prints the number of items in the list.",
    code: "fruits = ['apple', 'banana', 'cherry']\nprint(____(fruits))",
    correctAnswer: "len",
    manualGrade: false,
  },
  {
    type: "fake_compiler",
    order: 4,
    prompt: "Run this code mentally. What does the terminal display?",
    code: "for i in range(3):\n    print(i)",
    correctAnswer: "0\n1\n2",
    manualGrade: false,
  },
  {
    type: "free_text",
    order: 5,
    prompt:
      "In your own words, explain the difference between a list and a tuple in Python.",
    manualGrade: true,
  },
] as const;

export default function SeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [createdId, setCreatedId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function runSeed() {
    if (!user) return;
    setStatus("running");
    setErrorMsg("");
    try {
      const aRef = await addDoc(collection(db, "assignments"), {
        title: "Python Basics — Example Assignment",
        description:
          "A sample assignment covering basic Python concepts. Contains one question of each type.",
        order: 1,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      // Create questions in order (parallel is fine — Firestore doesn't care about insertion order)
      await Promise.all(
        SEED_QUESTIONS.map((q) =>
          addDoc(collection(db, "assignments", aRef.id, "questions"), q)
        )
      );

      setCreatedId(aRef.id);
      setStatus("done");
    } catch (err) {
      setErrorMsg(String(err));
      setStatus("error");
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/teacher")}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Assignments
        </button>
        <h1 className="text-xl font-semibold text-gray-900">Seed Example Data</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <p className="text-sm text-gray-700">
          Creates one assignment titled{" "}
          <strong>"Python Basics — Example Assignment"</strong> with five
          questions — one of each type (multiple choice, type output, fill in
          the blank, fake compiler, free text).
        </p>
        <p className="text-sm text-amber-700 rounded bg-amber-50 border border-amber-200 px-3 py-2">
          Run once only. Clicking again creates a duplicate assignment.
        </p>

        {status === "idle" && (
          <button
            onClick={runSeed}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Seed Assignment
          </button>
        )}

        {status === "running" && (
          <p className="text-sm text-gray-500">Creating…</p>
        )}

        {status === "done" && (
          <div className="space-y-3">
            <p className="text-sm text-green-700 font-medium">
              ✓ Seed assignment created with 5 questions.
            </p>
            <button
              onClick={() =>
                router.push(`/teacher/assignments/${createdId}`)
              }
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Assignment →
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">Failed to create seed data.</p>
            {errorMsg && (
              <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">
                {errorMsg}
              </pre>
            )}
            <button
              onClick={() => setStatus("idle")}
              className="text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
