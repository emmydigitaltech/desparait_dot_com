import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "@/components/SignInButton";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/browse");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6">
      <h1 className="text-4xl font-bold tracking-tight">Despariat</h1>
      <p className="mt-3 text-lg text-gray-600">
        Outgoing students sell. New students buy. Beds, fans, books and more,
        from people on your campus.
      </p>
      <div className="mt-8">
        <SignInButton />
      </div>
      {error && (
        <p className="mt-4 text-sm text-red-600">
          Sign-in failed. Try again.
        </p>
      )}
    </main>
  );
}
