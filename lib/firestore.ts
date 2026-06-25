import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { TEACHER_EMAIL, STUDENT_EMAIL } from "./roles";

function resolveRole(email: string): "teacher" | "student" | null {
  if (email === TEACHER_EMAIL) return "teacher";
  if (email === STUDENT_EMAIL) return "student";
  return null;
}

export async function ensureUserDoc(
  uid: string,
  email: string,
  name: string
): Promise<"teacher" | "student" | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data().role as "teacher" | "student" | null;
  }

  const role = resolveRole(email);
  await setDoc(ref, { email, name, role });
  return role;
}
