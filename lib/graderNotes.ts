import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Notes live in a sibling doc (assignments/{aid}/private/grading), never on
// the question doc itself, so the student's `getDocs(.../questions)` query
// never touches them. See firestore.rules for the matching access rule.
function notesRef(assignmentId: string) {
  return doc(db, "assignments", assignmentId, "private", "grading");
}

export async function getGraderNotes(
  assignmentId: string
): Promise<Record<string, string>> {
  const snap = await getDoc(notesRef(assignmentId));
  if (!snap.exists()) return {};
  return (snap.data().notes as Record<string, string> | undefined) ?? {};
}

export async function setGraderNote(
  assignmentId: string,
  questionId: string,
  text: string
): Promise<void> {
  // Nested-object + merge:true targets just this leaf field, leaving other
  // questions' notes in the map untouched.
  await setDoc(
    notesRef(assignmentId),
    { notes: { [questionId]: text } },
    { merge: true }
  );
}
