"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function assignRole(email: string, role: string | null) {
  const supabase = await createClient();
  const { data: me } = await supabase.rpc("current_admin_role");
  if (me !== "super_admin") return { error: "Forbidden" };

  const admin = await createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const target = data?.users.find(
    (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
  );
  if (!target) return { error: "No user with that email" };

  const { error } = await supabase.rpc("admin_set_admin_role", {
    target: target.id,
    new_role: role || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/roles");
  return { ok: true };
}