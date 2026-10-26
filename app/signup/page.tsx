import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create account – Despariat" };

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/onboarding");

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={safe(next)} />;
}
