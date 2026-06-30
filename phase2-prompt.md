# Phase 2: Teacher Authoring UI

Read @claude-code-prompt.md for the full project spec and data model. This is Phase 2 — the teacher-facing UI for creating assignments and questions. Phase 1 (auth, role routing, security rules, dashboards) is complete and committed. Build on top of it.

## Sub-phase order (build and verify in this order)
**Do Phase 2a fully and make it work before starting 2b.** Stop after 2a so I can verify writes land correctly in Firestore.

### Phase 2a — Assignment CRUD + Multiple Choice only
- Teacher dashboard (`app/teacher/page.tsx`): list all assignments ordered by their `order` field, each with Edit and Delete actions, plus a "New Assignment" button.
- Create/edit assignment form: `title`, `description`, and an `order` number field. Writes to `assignments/{id}` with `{ title, description, order, createdBy, createdAt }`. createdBy = current teacher uid.
- Within an assignment, a question list (ordered by question `order` field) and an "Add Question" flow.
- Implement the **multiple_choice** question type only in 2a:
  - Fields: `prompt`, a dynamic list of choice text inputs (add/remove rows, minimum 2), and a way to mark exactly one choice as correct (`correctIndex`).
  - Saves to `assignments/{id}/questions/{qid}` with `{ type: "multiple_choice", order, prompt, choices, correctIndex, manualGrade: false }`.
- Edit, delete, and reorder questions via an **order-number field** (no drag-and-drop). Lists sort by that number.

**Verify before continuing:** create an assignment, add two multiple-choice questions, edit one, delete one, reorder via the number field, and confirm in the Firestore Data tab that the docs and fields are correct. Confirm a student account cannot write (rules already enforce this).

### Phase 2b — Remaining four question types
Extend the "Add Question" form so the visible fields adapt to a selected `type` dropdown. Add:
- **type_output**: `prompt` + `code` (Python snippet shown to student) + `correctAnswer` (expected printed output). `manualGrade: false`.
- **fill_blank**: `prompt` + `code` (snippet containing a `____` blank) + `correctAnswer` (the missing token). `manualGrade: false`.
- **fake_compiler**: `prompt` + `code` (snippet) + `correctAnswer` (expected stdout or error text). Rendered for the student later in a styled fake terminal — but in the authoring UI it's just a code box + expected-output field. NO real execution. `manualGrade: false`.
- **free_text**: `prompt` only, no answer key. `manualGrade: true`.

The form must show only the fields relevant to the chosen type, and validate that required fields for that type are filled before saving.

## Seed data
Provide a seed (a script or a clearly-documented one-time function) that creates ONE example assignment containing one question of each of the five types, so I can see the full range working without manual entry. Document how to run it in the README.

## Constraints
- Keep the data model exactly as specified in @claude-code-prompt.md — do not rename fields.
- Teacher-only writes are already enforced by firestore.rules; don't loosen them.
- Keep the UI minimal and functional (plain Tailwind, no component library). Correctness of the Firestore writes and the adaptive form logic matters more than visual polish.
- TypeScript must compile clean (`npx tsc --noEmit`) and `npm run dev` must run without errors at each stop point.

Start with Phase 2a. Stop when it runs and writes correctly so I can verify before 2b.
