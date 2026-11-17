import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { userId, action, reason, days } = await req.json();
  if (!["suspend", "ban", "restore"].includes(action)) {
    return NextResponse.json({ error: "Bad action" }, { status: 400 });
  }
  const until =
    action === "suspend" && days
      ? new Date(Date.now() + Number(days) * 86400000).toISOString()
      : null;

  // runs as the signed-in admin; the SQL function rejects anyone else
  const { error } = await supabase.rpc("admin_set_user_status", {
    p_user: userId,
    p_action: action,
    p_reason: reason ?? null,
    p_until: until,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  // a ban also blocks sign-in; restore lifts it
  if (action === "ban" || action === "restore") {
    const admin = await createAdminClient();
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: action === "ban" ? "876000h" : "none",
    });
  }
  return NextResponse.json({ ok: true });
}
