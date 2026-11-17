import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function Banner() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: r } = await supabase
    .from("user_restrictions")
    .select("status,reason,until")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!r || (r.until && new Date(r.until) <= new Date())) return null;

  const days = r.until
    ? Math.max(1, Math.ceil((new Date(r.until).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div style={{ background: r.status === "banned" ? "#7f1d1d" : "#92400e", color: "#fff", padding: "10px 16px", fontSize: 14 }}>
      <strong>Your account is {r.status}.</strong>{" "}
      {days ? `${days} day${days === 1 ? "" : "s"} left. ` : "Until further notice. "}
      {r.reason ? `Reason: ${r.reason}. ` : ""}
      {r.status === "suspended" && (
        <Link href="/appeal" style={{ color: "#fff", textDecoration: "underline", fontWeight: 600 }}>
          Appeal this decision
        </Link>
      )}
    </div>
  );
}

export default function RestrictionBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}