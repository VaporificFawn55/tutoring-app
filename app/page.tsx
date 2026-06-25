"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function RootPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (role === "teacher") {
      router.replace("/teacher");
    } else if (role === "student") {
      router.replace("/student");
    } else {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  return null;
}
