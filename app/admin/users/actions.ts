"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setVerified(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const verify = formData.get("verify") === "true";
  if (!userId) throw new Error("Missing user id");

  // Re-check admin on every call. Never trust the page alone.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data: me } = await supabase
    .from("profiles").select("role,is_admin").eq("id", user.id).single();
  if (!(me?.is_admin || me?.role === "admin")) throw new Error("Forbidden");

  const admin = await createAdminClient();
  const { error } = await admin
    .from("profiles").update({ is_verified: verify }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}