import {
  collectionGroup,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp,
  DocumentReference,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Attempt, Question, Submission } from "./types";

export type PendingAttempt = {
  attemptRef: DocumentReference;
  attempt: Attempt;
  assignmentId: string;
  assignmentTitle: string;
  question: Question;
};

// No `where` filter on the collectionGroup query — a filtered query needs an
// explicit collection-group index; a plain fetch doesn't. Volume is low for a
// single-student app, so filtering client-side is fine.
export async function getPendingAttempts(): Promise<PendingAttempt[]> {
  const snap = await getDocs(collectionGroup(db, "attempts"));
  const pending = snap.docs.filter((d) => {
    const data = d.data();
    return data.isCorrect === null && data.gradedManually === null;
  });

  const assignmentCache = new Map<string, string>();
  const questionCache = new Map<string, Question>();

  const resolved = await Promise.all(
    pending.map(async (attemptDoc) => {
      const attempt = { id: attemptDoc.id, ...attemptDoc.data() } as Attempt;
      const subRef = attemptDoc.ref.parent.parent;
      if (!subRef) return null;
      const subSnap = await getDoc(subRef);
      if (!subSnap.exists()) return null;
      const submission = subSnap.data() as Omit<Submission, "id">;
      const assignmentId = submission.assignmentId;

      let assignmentTitle = assignmentCache.get(assignmentId);
      if (!assignmentTitle) {
        const aSnap = await getDoc(doc(db, "assignments", assignmentId));
        assignmentTitle = aSnap.exists()
          ? (aSnap.data().title as string)
          : "Unknown assignment";
        assignmentCache.set(assignmentId, assignmentTitle);
      }

      const qKey = `${assignmentId}/${attempt.questionId}`;
      let question = questionCache.get(qKey);
      if (!question) {
        const qSnap = await getDoc(
          doc(db, "assignments", assignmentId, "questions", attempt.questionId)
        );
        question = qSnap.exists()
          ? ({ id: qSnap.id, ...qSnap.data() } as Question)
          : ({ id: attempt.questionId, prompt: "Unknown question" } as Question);
        questionCache.set(qKey, question);
      }

      return {
        attemptRef: attemptDoc.ref,
        attempt,
        assignmentId,
        assignmentTitle,
        question,
      } as PendingAttempt;
    })
  );

  return resolved
    .filter((r): r is PendingAttempt => r !== null)
    .sort(
      (a, b) =>
        (a.attempt.createdAt?.toMillis?.() ?? 0) -
        (b.attempt.createdAt?.toMillis?.() ?? 0)
    );
}

export async function gradeAttempt(
  ref: DocumentReference,
  opts: { correct: boolean; feedback?: string }
): Promise<void> {
  await updateDoc(ref, {
    gradedManually: opts.correct,
    ...(opts.feedback !== undefined ? { feedback: opts.feedback } : {}),
    gradedAt: serverTimestamp(),
  });
}
