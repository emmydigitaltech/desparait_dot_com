import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in – Despariat" };

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={safe(next)} />;
}
