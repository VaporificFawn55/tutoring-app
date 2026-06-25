"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

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
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Tutoring App — Student</span>
        <button
          onClick={() => signOut(auth).then(() => router.replace("/login"))}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Sign out
        </button>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
