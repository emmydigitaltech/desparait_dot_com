import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create account · Despariat" };

const safe = (n?: string) =>
  n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") && !n.startsWith("/signup")
    ? n
    : "/onboarding";

async function Gate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const { next } = await searchParams;
  const target = safe(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(target);

  return <AuthForm mode="signup" next={target} />;
}

export default function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense>
      <Gate searchParams={searchParams} />
    </Suspense>
  );
}