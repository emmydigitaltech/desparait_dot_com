"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setVerified(userId: string, verify: boolean): Promise<{ error?: string }> {
  if (!userId) return { error: "Missing user id" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: me } = await supabase
    .from("profiles").select("role,is_admin").eq("id", user.id).single();
  if (!(me?.is_admin || me?.role === "admin")) return { error: "Forbidden: not an admin" };

  const admin = await createAdminClient();
  const { error } = await admin
    .from("profiles").update({ is_verified: verify }).eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return {};
}