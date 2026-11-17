import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function Bell() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <Link href="/notifications" className="dp-btn-o dp-cart-link" aria-label="Notifications">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {!!count && <span className="dp-cart-badge">{count > 9 ? "9+" : count}</span>}
    </Link>
  );
}

export default function NotificationBell() {
  return (
    <Suspense fallback={null}>
      <Bell />
    </Suspense>
  );
}
