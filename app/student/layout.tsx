"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NavBar } from "@/components/ui/NavBar";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || (role !== "student" && role !== "teacher"))) {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  if (loading || !user || (role !== "student" && role !== "teacher")) return null;

  // A teacher landing here is previewing the real student's experience,
  // read-only — never their own separate run-through. See the assignment
  // runner / review pages for how writes are blocked in this mode.
  const previewing = role === "teacher";

  return (
    <div className="min-h-screen bg-canvas">
      <NavBar
        brand={
          previewing
            ? "Tutoring App — Student view (previewing)"
            : "Tutoring App — Student"
        }
        links={[
          ...(previewing ? [{ href: "/teacher", label: "← Back to Teacher" }] : []),
          { href: "/student", label: "Assignments" },
          { href: "/student/lessons", label: "Lessons" },
          { href: "/student/playground", label: "Playground" },
        ]}
      />
      <main className="p-6">{children}</main>
    </div>
  );
}
