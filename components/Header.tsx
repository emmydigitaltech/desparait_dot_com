import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import CategoryNav from "./CategoryNav";
import ProfileMenu from "./ProfileMenu";

export default async function Header() {
  await connection(); // must come before any Supabase call

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!profile?.is_admin;
  }

  return (
    <header className="dp-header">
      <div className="dp-top">
        <Link href="/" className="dp-logo">Despariat</Link>
        <form action="/browse" className="dp-search" role="search">
          <input name="q" placeholder="Search phones, past questions, braiding, printing…" aria-label="Search listings" />
          <button type="submit">Search</button>
        </form>
        {user ? (
          <>
            <Link href="/dashboard" className="dp-btn-o">Dashboard</Link>
            <Link href="/listings/new" className="dp-btn">Sell something</Link>
            <ProfileMenu isAdmin={isAdmin} />
          </>
        ) : (
          <>
            <Link href="/login" className="dp-btn-o">Sign in</Link>
            <Link href="/signup" className="dp-btn">Create account</Link>
          </>
        )}
      </div>
      <CategoryNav />
    </header>
  );
}