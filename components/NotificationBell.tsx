import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import NotificationBellLink from "./NotificationBellLink";

async function Bell() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return <NotificationBellLink count={count ?? 0} />;
}

export default function NotificationBell() {
  return (
    <Suspense fallback={null}>
      <Bell />
    </Suspense>
  );
}