import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in · Despariat" };

const safe = (n?: string) =>
  n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") && !n.startsWith("/signup")
    ? n
    : "/dashboard";

async function Gate({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const { next } = await searchParams;
  const target = safe(next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(target);

  return <AuthForm mode="login" next={target} />;
}

export default function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <Suspense>
      <Gate searchParams={searchParams} />
    </Suspense>
  );
}