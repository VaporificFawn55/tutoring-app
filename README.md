# Tutoring App

A single-teacher / single-student coding-practice platform.

## Purpose

I built this app to support the student I'm currently tutoring. It gives them a
private space to practice programming between our sessions: I (the teacher)
author coding exercises, publish them when they're ready, and the student works
through them on their own. Most questions grade themselves instantly so the
student gets immediate feedback, while open-ended answers come back to me to
review by hand. It's intentionally scoped to one teacher and one student.

## Features so far

### Accounts & roles
- Email/password sign-in via Firebase Authentication.
- Two fixed roles — **teacher** and **student** — assigned automatically on
  first sign-in based on the account's email. Each role has its own protected
  section of the app, enforced by Firestore security rules.

### Teacher
- **Assignments dashboard** listing every assignment with its published/draft
  status.
- **Create, edit, and delete** assignments (title, description, and display
  order).
- **Publish / un-publish** each assignment to control what the student can see.
- **Add, edit, and order questions** within an assignment, in five formats:
  - **Multiple Choice** — pick the correct option.
  - **Type Output** — predict the output of a Python snippet.
  - **Fill in the Blank** — supply the token that completes the code.
  - **Fake Compiler** — a terminal-styled snippet to reason about.
  - **Free Text** — an open-ended answer (not auto-graded).
- **Review Queue** for grading free-text answers as correct/incorrect by hand,
  with a badge showing how many answers are waiting.
- **Progress view** per assignment showing the student's answers and scores.

### Student
- **Assignments dashboard** showing only published assignments, each with a
  status badge (Not started / In progress / Completed) and score so far.
- **Question runner** that presents one question at a time and preserves the
  formatting of the prompt exactly as the teacher wrote it.
- **Instant auto-grading** for all question types except free text, with
  correct / try-again / submitted feedback.
- **Resume support** — progress is saved per question, so the student picks up
  where they left off.
- **Completion summary** with an auto-graded score plus an overall score once
  any free-text answers have been reviewed.

## Firebase project setup

1. Go to [Firebase console](https://console.firebase.google.com) and create a new project.
2. Enable **Authentication → Email/Password** sign-in method.
3. Create two user accounts manually in Authentication → Users:
   - The teacher account
   - The student account
4. Enable **Firestore Database** in production mode (deploy the rules below before use).
5. Register a **Web app** in Project Settings → Your apps and copy the config.

## Environment variables

Copy `.env.local.example` to `.env.local` and paste in the six Firebase config values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Role configuration

Open `lib/roles.ts` and replace the placeholder emails with the actual emails you created in Firebase Auth:

```ts
export const TEACHER_EMAIL = "your-teacher@example.com";
export const STUDENT_EMAIL = "your-student@example.com";
```

Roles are assigned the first time each user signs in — the app writes a `users/{uid}` doc with `role: "teacher"` or `role: "student"` based on the email match.

## Firestore security rules

Deploy `firestore.rules` to your project:

```bash
# install Firebase CLI if needed
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

## Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visitors are redirected to `/login`.

## Vercel deployment

1. Push to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add all six `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel → Project Settings → Environment Variables.
4. Deploy.
