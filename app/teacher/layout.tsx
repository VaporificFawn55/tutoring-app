"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NavBar } from "@/components/ui/NavBar";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || role !== "teacher")) {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "teacher") return null;

  return (
    <div className="min-h-screen bg-canvas">
      <NavBar
        brand="Tutoring App — Teacher"
        links={[
          { href: "/teacher", label: "Assignments" },
          { href: "/teacher/lessons", label: "Lessons" },
          { href: "/teacher/grading", label: "Grading" },
          { href: "/student", label: "View as Student" },
        ]}
      />
      <main className="p-6">{children}</main>
    </div>
  );
}
