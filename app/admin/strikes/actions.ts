"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function issueStrike(userId: string, reason: string) {
  if (!userId) return { error: "Missing user id" };
  if (!reason.trim()) return { error: "A reason is required" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_issue_strike", {
    p_user: userId,
    p_reason: reason,
  });
  if (error) return { error: error.message };

  const result = data as string;
  if (result === "banned") {
    const admin = await createAdminClient();
    const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (banErr) {
      return { error: "Strike saved but sign-in block failed: " + banErr.message };
    }
  }

  revalidatePath("/admin/users");
  return { ok: true, result };
}