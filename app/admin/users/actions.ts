"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, type AdminRole } from "@/lib/admin-roles";

export async function setVerified(userId: string, verify: boolean): Promise<{ error?: string }> {
  if (!userId) return { error: "Missing user id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: role } = await supabase.rpc("current_admin_role");
  if (!can(role as AdminRole | null, ["moderator"])) return { error: "Forbidden: not allowed" };

  const admin = await createAdminClient();
  const { error } = await admin
    .from("profiles").update({ is_verified: verify }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return {};
}