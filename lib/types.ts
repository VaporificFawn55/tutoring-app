import { Timestamp } from "firebase/firestore";

export type Assignment = {
  id: string;
  title: string;
  description: string;
  order: number;
  createdBy: string;
  createdAt: Timestamp;
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
