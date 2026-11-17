"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function resolveAppeal(id: string, approve: boolean, note: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_appeal", {
    p_appeal: id,
    p_approve: approve,
    p_note: note.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/appeals");
  return { ok: true };
}