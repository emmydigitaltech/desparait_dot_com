"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MarkRead() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(async () => {
      await fetch("/api/notifications/read", { method: "POST" });
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}