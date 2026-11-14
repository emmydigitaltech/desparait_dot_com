import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import CategoryNav from "./CategoryNav";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./Themetoggle";
import CartIcon from "./CartIcon";
import MessageIcon from "./MessageIcon";

export default async function Header() {
  await connection(); // must come before any Supabase call

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let avatarUrl: string | null = null;
  let fullName: string | null = null;
  let cartCount = 0;
  let unreadCount = 0;
  if (user) {
    const [{ data: profile }, { count: cart }, { count: unread }] = await Promise.all([
      supabase
        .from("profiles")
        .select("is_admin, avatar_url, full_name")
        .eq("id", user.id)
        .single(),
      supabase.from("cart_items").select("id", { count: "exact", head: true }),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", user.id),
    ]);
    isAdmin = !!profile?.is_admin;
    avatarUrl = profile?.avatar_url ?? null;
    fullName = profile?.full_name ?? null;
    cartCount = cart ?? 0;
    unreadCount = unread ?? 0;
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
              <Link href="/messages" className="dp-btn-o dp-cart-link" aria-label="Messages">
                <MessageIcon size={20} />
                {unreadCount > 0 && <span className="dp-cart-badge">{unreadCount}</span>}
              </Link>
              <Link href="/cart" className="dp-btn-o dp-cart-link" aria-label="Cart">
                <CartIcon size={20} />
                {cartCount > 0 && <span className="dp-cart-badge">{cartCount}</span>}
              </Link>
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