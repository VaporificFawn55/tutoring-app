# Build: Lightweight Assignment Platform (Duolingo-lite for one student)

## Goal
Build a simple web app where a teacher creates coding assignments and a single student works through them question-by-question with instant feedback. Think "Duolingo for Python practice" but with a plain, clean UI — no sprites, no gamification, no animations beyond basic feedback states.

## Stack (use exactly this)
- **Next.js** (App Router, TypeScript) — deployable to Vercel
- **Firebase Auth** (email/password)
- **Cloud Firestore** for all data
- **Tailwind CSS** for styling (plain, readable, no component library required)
- Firebase Web SDK v9+ (modular). Read config from `NEXT_PUBLIC_FIREBASE_*` env vars. Include a `.env.local.example`.

## Roles
Two roles, assigned by email match (hardcode two emails in a config file `lib/roles.ts` with `TEACHER_EMAIL` and `STUDENT_EMAIL` constants — leave them as clearly-marked placeholders). On login, look up/create the `users/{uid}` doc and set role by matching the signed-in email. Route teacher and student to different dashboards. No public signup page is needed — accounts are created in the Firebase console, the app just signs in.

## Question types (5)
1. **multiple_choice** — choices array, one correct index. Auto-graded.
2. **type_output** — student types what a shown Python snippet prints. Auto-graded, exact match, case-insensitive, trim whitespace.
3. **fill_blank** — code snippet with a `____` blank; student types the missing token. Auto-graded, exact match (case-insensitive, trimmed).
4. **fake_compiler** — show a Python snippet inside a styled fake terminal; student types the expected stdout (or error text). Auto-graded, exact match (case-insensitive, trimmed). NO real code execution — purely presentational terminal styling.
5. **free_text** — short written answer. **NOT auto-graded.** Saved as `needs_review`; the teacher grades it manually later.

## Grading & attempts
- Auto-graded types: show instant correct/incorrect feedback. **Retries allowed** — log every attempt.
- free_text: save the answer, mark `gradedManually: null` (pending), surface in teacher review queue.
- Every attempt is a separate logged record (answer, isCorrect, timeSpentMs, timestamp). timeSpentMs = time from when the question was shown to when submitted.

## Firestore data model
- `users/{uid}` — { email, name, role: "teacher" | "student" }
- `assignments/{id}` — { title, description, order, createdBy, createdAt }
- `assignments/{id}/questions/{qid}` — { type, order, prompt, code?, choices?, correctIndex?, correctAnswer?, manualGrade: boolean }
- `submissions/{studentUid}_{assignmentId}` — { studentUid, assignmentId, status: "in_progress"|"completed", autoScore, totalAutoGradable, startedAt, completedAt? }
- `submissions/{...}/attempts/{attemptId}` — { questionId, answer, isCorrect: boolean|null, gradedManually: boolean|null, timeSpentMs, createdAt }

## Teacher UI
- Dashboard listing all assignments + a "needs review" count.
- Create/edit assignment (title, description).
- Add/edit/reorder questions of all 5 types within an assignment. Form fields adapt to the selected type.
- View student progress: per assignment, show completion status, auto-score, and a per-question attempt history (each attempt's answer, correctness, time spent, timestamp).
- Review queue: list all pending free_text answers; teacher marks each correct/incorrect, which updates the attempt's `gradedManually` and recomputes the submission score.

## Student UI
- Dashboard listing assigned assignments with status (not started / in progress / completed) and score.
- Assignment runner: one question at a time, Next/Submit flow, instant feedback for auto-graded types, retry on wrong answers, progress indicator (e.g. "Q3 of 8"). free_text questions just confirm "submitted for review."

## Security rules
Write Firestore security rules: students can only read assignments and read/write their own submissions and attempts; only the teacher can create/edit assignments/questions and write manual grades. Include the rules file.

## Build in 3 phases — implement Phase 1 fully and make it run before moving on
- **Phase 1:** Project scaffold, Firebase setup, auth + role routing, empty teacher and student dashboards, data model + security rules. Verify login works for both roles.
- **Phase 2:** Teacher assignment + question authoring (all 5 types), seeded with one example assignment.
- **Phase 3:** Student runner with all question types, attempt logging, instant feedback/retries, teacher progress views + free_text review queue + score recomputation.

## Deliverables
- Working Next.js app runnable with `npm run dev`
- `.env.local.example`, `firestore.rules`, and a `README.md` covering Firebase project setup, the two env emails, and Vercel deployment steps.

Keep the UI minimal and functional. Prioritize correctness of the data model and grading logic over visual polish.
