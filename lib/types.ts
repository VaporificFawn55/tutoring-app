import { Timestamp } from "firebase/firestore";

export type Assignment = {
  id: string;
  title: string;
  description: string;
  order: number;
  createdBy: string;
  createdAt: Timestamp;
  // Absent on legacy pre-feature docs — treat as unpublished (draft) wherever read.
  published?: boolean;
};

export type QuestionType =
  | "multiple_choice"
  | "type_output"
  | "fill_blank"
  | "fake_compiler"
  | "free_text";

export type Question = {
  id: string;
  type: QuestionType;
  order: number;
  prompt: string;
  code?: string;
  choices?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  manualGrade: boolean;
};

export type Submission = {
  id: string;
  studentUid: string;
  assignmentId: string;
  status: "in_progress" | "completed";
  autoScore: number;
  totalAutoGradable: number;
  startedAt: Timestamp;
  completedAt?: Timestamp;
};

export type Attempt = {
  id: string;
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  gradedManually: boolean | null;
  timeSpentMs: number;
  createdAt: Timestamp;
};
