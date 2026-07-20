# Phase 3: Student Runner + Grading + Teacher Progress Views

Read @claude-code-prompt.md for the full spec and data model. Phases 1 and 2 (auth, role routing, security rules, full teacher authoring UI for all five question types) are complete, verified, and committed. Build on them.

## Behavior decisions (apply throughout)
- **Retries:** auto-graded questions can be retried until correct. Log EVERY attempt (never overwrite).
- **Feedback:** on submit, tell the student only correct/incorrect. NEVER reveal the correct answer.
- **Resume:** the student can leave an assignment mid-way and resume where they left off. Progress must persist to Firestore, not just local state.
- **Text matching (type_output, fill_blank, fake_compiler):** compare after trimming leading/trailing whitespace and lowercasing both sides (case-insensitive). Exact match otherwise.

## Split into 3a and 3b. Build 3a fully and verify before starting 3b.

### Phase 3a — Student runner + auto-grading + attempt logging
- **Student dashboard** (`app/student/page.tsx`): list assignments (ordered by `order`) with status per assignment — Not started / In progress / Completed — and score when completed. Status derives from the submission doc.
- **Assignment runner** (`app/student/assignments/[id]/...`): present questions one at a time, ordered by question `order`. Progress indicator ("Question X of N").
- **Per-type answer UI:**
  - multiple_choice — radio list of `choices`; submit selected index.
  - type_output — show `code` (read-only), student types expected output.
  - fill_blank — show `code` with the `____`, student types the missing token.
  - fake_compiler — show `code` inside a styled fake terminal (monospace, dark box; purely presentational, NO execution); student types expected stdout/error.
  - free_text — textarea; submits for manual review, no auto-grade.
- **Submission model:** on first open of an assignment, create/find `submissions/{studentUid}_{assignmentId}` with `{ studentUid, assignmentId, status: "in_progress", autoScore: 0, totalAutoGradable: <count of non-free_text questions>, startedAt }`. Use this deterministic ID so resume needs no query.
- **Attempt logging:** every submit writes a new doc under `submissions/{...}/attempts/{attemptId}` = `{ questionId, answer, isCorrect: boolean|null, gradedManually: null, timeSpentMs, createdAt }`.
  - Auto-graded types: compute `isCorrect` (per matching rules above), `gradedManually` stays null.
  - free_text: `isCorrect: null`, `gradedManually: null` (pending teacher review).
  - `timeSpentMs` = time from when the question was shown to when submitted.
- **Retry flow:** on a wrong auto-graded answer, allow resubmit; each try is its own attempt doc. The student advances only when correct (or, for free_text, once submitted).
- **Resume logic:** on opening an assignment, determine the first question not yet answered correctly (for auto types) or not yet submitted (free_text), and start there. Already-correct/submitted questions are considered done.
- **Scoring:** `autoScore` = count of auto-gradable questions answered correctly at least once. Update the submission doc as they progress. When all questions are done (auto ones correct, free_text submitted), set `status: "completed"`, `completedAt`.

**Verify before 3b:** as the student, complete the seeded assignment — get a wrong answer then a right one on an auto type (confirm both attempts logged), submit a free_text answer, leave mid-assignment and reopen (confirm resume position), and check Firestore: submission doc has correct status/autoScore/totalAutoGradable, and attempts subcollection has one doc per try with correct fields. Confirm firestore.rules still block a student from reading another student's submission (rules already enforce this; don't loosen them).

### Phase 3b — Teacher progress + free-text review
- **Progress view** (under teacher assignment detail, or a new progress page): for the student's submission on an assignment, show per-question history — each attempt's answer, correct/incorrect (or "pending review" for free_text), time spent, timestamp, and attempt count. Show overall status and autoScore.
- **Review queue:** a teacher page listing all free_text attempts where `gradedManually == null`, across assignments. For each, show the question prompt and the student's answer, with Correct / Incorrect buttons. Marking sets `gradedManually: true/false` on that attempt and recomputes the submission's score to include manually-graded-correct free_text questions.
- Recompute score consistently: define the assignment's total as (auto-gradable count + free_text count) and the achieved score as (auto correct + free_text marked correct). Display both to teacher and student.

**Verify:** grade the pending free_text answer from the queue; confirm the attempt's `gradedManually` updates and the score recomputes in both teacher and student views.

## Constraints
- Keep data model field names exactly as in @claude-code-prompt.md — do not rename.
- Do not loosen firestore.rules. If a rule genuinely blocks a legitimate read/write the student or teacher needs, call it out explicitly and propose the minimal rule change for my approval rather than silently widening access.
- Minimal functional Tailwind UI; correctness of attempt logging, resume, and scoring matters most.
- `npx tsc --noEmit` passes and `npm run dev` runs clean at each stop point.

Start with Phase 3a. Stop when the student can complete and resume an assignment with attempts logging correctly, so I can verify before 3b.
