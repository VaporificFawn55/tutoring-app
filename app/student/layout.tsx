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
    if (!loading && (!user || role !== "student")) {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "student") return null;

  return (
    <div className="min-h-screen bg-canvas">
      <NavBar
        brand="Tutoring App — Student"
        links={[
          { href: "/student", label: "Assignments" },
          { href: "/student/playground", label: "Playground" },
        ]}
      />
      <main className="p-6">{children}</main>
    </div>
  );
}
