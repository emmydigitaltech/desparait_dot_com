import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/admin-roles";

export async function getAdminRole(): Promise<AdminRole | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_admin_role");
  return (data as AdminRole) ?? null;
}