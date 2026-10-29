"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { data: me } = await supabase
    .from("profiles").select("role,is_admin").eq("id", user.id).single();
  if (!(me?.is_admin || me?.role === "admin")) return { error: "Forbidden: not an admin" };

  const admin = await createAdminClient();

  // Look up the request server-side so the client can't pass a different user id
  const { data: reqRow, error: e0 } = await admin
    .from("verification_requests")
    .select("id,user_id,status")
    .eq("id", requestId)
    .single();
  if (e0 || !reqRow) return { error: e0?.message ?? "Request not found" };
  if (reqRow.status !== "pending") return { error: "Request already handled" };

  // Verify the profile first, so a failure can't leave a request marked approved with no tick
  if (approve) {
    const { error: e1 } = await admin
      .from("profiles").update({ is_verified: true }).eq("id", reqRow.user_id);
    if (e1) return { error: e1.message };
  }

  const { error: e2 } = await admin
    .from("verification_requests")
    .update({ status: approve ? "approved" : "rejected", note: approve ? null : note })
    .eq("id", requestId);
  if (e2) return { error: e2.message };

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return {};
}