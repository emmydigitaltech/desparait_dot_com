import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import SignInButton from "./SignInButton";
import CategoryNav from "./CategoryNav";

export default async function Header() {
  await connection(); // must come before any Supabase call

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
          </>
        ) : (
          <div className="dp-signin">
            <SignInButton />
          </div>
        )}
      </div>
      <CategoryNav />
    </header>
  );
}