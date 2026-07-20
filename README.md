# Tutoring App

A single-teacher / single-student coding-practice platform.

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
