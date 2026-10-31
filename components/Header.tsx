import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import CategoryNav from "./CategoryNav";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./Themetoggle";

export default async function Header() {
  await connection(); // must come before any Supabase call

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let avatarUrl: string | null = null;
  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, avatar_url, full_name")
      .eq("id", user.id)
      .single();
    isAdmin = !!profile?.is_admin;
    avatarUrl = profile?.avatar_url ?? null;
    fullName = profile?.full_name ?? null;
  }

  return (
    <header className="dp-header">
      <div className="dp-top">
        <Link href="/" className="dp-logo" aria-label="Despariat home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Despariat" className="dp-logo-img" />
        </Link>

        <form action="/browse" className="dp-search" role="search">
          <input
            name="q"
            placeholder="Search phones, past questions, braiding, printing…"
            aria-label="Search listings"
          />
          <button type="submit">Search</button>
        </form>

        <div className="dp-actions">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" className="dp-btn-o dp-hide-sm">Dashboard</Link>
              <Link href="/listings/new" className="dp-btn dp-hide-sm">Sell something</Link>
              <ProfileMenu isAdmin={isAdmin} avatarUrl={avatarUrl} name={fullName} />
            </>
          ) : (
            <>
              <Link href="/login" className="dp-btn-o">Sign in</Link>
              <Link href="/signup" className="dp-btn dp-hide-sm">Create account</Link>
            </>
          )}
        </div>
      </div>
      <CategoryNav />
    </header>
  );
}