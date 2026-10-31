import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import type { Lesson, LessonBlock } from "./types";

function sortByOrder(lessons: Lesson[]): Lesson[] {
  return lessons.slice().sort((a, b) => a.order - b.order);
}

// No `orderBy` combined with the equality filter below — that pairing needs a
// composite index. Sort client-side instead (same trick as the student
// assignments dashboard).
export async function getPublishedLessons(): Promise<Lesson[]> {
  const snap = await getDocs(
    query(collection(db, "lessons"), where("published", "==", true))
  );
  return sortByOrder(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lesson)
  );
}

export async function getAllLessons(): Promise<Lesson[]> {
  const snap = await getDocs(collection(db, "lessons"));
  return sortByOrder(
    snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lesson)
  );
}

export function newTextBlock(): LessonBlock {
  return { kind: "text", text: "" };
}

export function newCodeBlock(): LessonBlock {
  return { kind: "code", code: "", runnable: true, language: "python" };
}

export function moveBlock(
  blocks: LessonBlock[],
  index: number,
  direction: -1 | 1
): LessonBlock[] {
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return blocks;
  const next = blocks.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
