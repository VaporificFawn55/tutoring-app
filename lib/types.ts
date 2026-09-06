import { Timestamp } from "firebase/firestore";

export type Assignment = {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: Timestamp;
  // Absent on legacy pre-feature docs — treat as unpublished (draft) wherever read.
  published?: boolean;
};

export type QuestionType =
  | "multiple_choice"
  | "type_output"
  | "fill_blank"
  | "fake_compiler" // deprecated: still rendered, removed from the authoring UI
  | "free_text"
  | "code_exercise";

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
  // code_exercise
  starterCode?: string; // editor prefill
  expectedStdout?: string; // auto-grade target; absent => manual grading
  stdinInput?: string; // canned stdin fed to input()
  // any code-bearing type: offer "Run this" (unused until wired)
  runnable?: boolean;
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
  // code_exercise
  code?: string; // submitted source (also mirrored into `answer`)
  stdout?: string; // captured output of the graded run
  stderr?: string;
  runCount?: number; // times Run was pressed before submitting
  durationMs?: number; // wall time of the graded run
  // manual grading (written in the grading view)
  feedback?: string;
  gradedAt?: Timestamp;
};
