"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NavBar } from "@/components/ui/NavBar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ThemeContext, useStoredTheme } from "@/contexts/ThemeContext";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useStoredTheme();

  useEffect(() => {
    if (!loading && (!user || role !== "teacher")) {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "teacher") return null;

  return (
    <ThemeContext.Provider value={theme}>
    <div data-theme={theme} className="min-h-screen bg-canvas">
      <NavBar
        brand="Tutoring App — Teacher"
        links={[
          { href: "/teacher", label: "Assignments" },
          { href: "/teacher/lessons", label: "Lessons" },
          { href: "/teacher/grading", label: "Grading" },
          { href: "/student", label: "View as Student" },
        ]}
        actions={<ThemeToggle theme={theme} onChange={setTheme} />}
      />
      <main className="p-6">{children}</main>
    </div>
    </ThemeContext.Provider>
  );
}
