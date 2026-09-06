"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserDoc } from "@/lib/firestore";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const role = await ensureUserDoc(
        user.uid,
        user.email ?? "",
        user.displayName ?? user.email ?? ""
      );

      if (role === "teacher") {
        router.replace("/teacher");
      } else if (role === "student") {
        router.replace("/student");
      } else {
        setError("This account is not authorized. Contact your administrator.");
        setLoading(false);
      }
    } catch {
      setError("Invalid email or password.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <Card padding="lg" className="w-full max-w-sm shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-ink">Sign in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            loadingLabel="Signing in…"
          >
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
