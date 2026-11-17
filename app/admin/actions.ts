"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, type AdminRole } from "@/lib/admin-roles";

export async function decideRequest(
  requestId: string,
  approve: boolean,
  note: string | null
): Promise<{ error?: string }> {
  if (!requestId) return { error: "Missing request id" };
  if (!approve && !note) return { error: "A rejection reason is required" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: role } = await supabase.rpc("current_admin_role");
  if (!can(role as AdminRole | null, ["moderator"])) {
    return { error: "Forbidden: not allowed" };
  }

  // Check status server-side so a stale page can't re-decide a request
  const admin = await createAdminClient();
  const { data: reqRow, error: e0 } = await admin
    .from("verification_requests")
    .select("id,status")
    .eq("id", requestId)
    .single();
  if (e0 || !reqRow) return { error: e0?.message ?? "Request not found" };
  if (reqRow.status !== "pending") return { error: "Request already handled" };

  // Runs as the signed-in admin; the SQL function enforces the role again
  const { error } = await supabase.rpc("review_verification", {
    req_id: requestId,
    approve,
    reviewer_note: approve ? null : note,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return {};
}