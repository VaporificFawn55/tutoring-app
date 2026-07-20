import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Submission } from "./types";

export async function getStudentUid(): Promise<string | null> {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "student"), limit(1))
  );
  return snap.empty ? null : snap.docs[0].id;
}

export type ScoreSummary = {
  submission: Submission | null;
  autoScore: number;
  totalAutoGradable: number;
  achieved: number;
  total: number;
};

// achieved/total folds in manually-graded free_text answers on top of the
// stored auto-only autoScore/totalAutoGradable fields.
export async function getScoreSummary(
  assignmentId: string,
  studentUid: string
): Promise<ScoreSummary> {
  const subId = `${studentUid}_${assignmentId}`;
  const [subSnap, qSnap] = await Promise.all([
    getDoc(doc(db, "submissions", subId)),
    getDocs(collection(db, "assignments", assignmentId, "questions")),
  ]);
  const total = qSnap.size;

  if (!subSnap.exists()) {
    return { submission: null, autoScore: 0, totalAutoGradable: 0, achieved: 0, total };
  }

  const submission = { id: subSnap.id, ...subSnap.data() } as Submission;
  const attSnap = await getDocs(collection(db, "submissions", subId, "attempts"));
  const gradedCorrect = attSnap.docs.filter((d) => d.data().gradedManually === true).length;

  return {
    submission,
    autoScore: submission.autoScore,
    totalAutoGradable: submission.totalAutoGradable,
    achieved: submission.autoScore + gradedCorrect,
    total,
  };
}
