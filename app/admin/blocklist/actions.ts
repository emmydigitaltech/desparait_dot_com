"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addBlock(kind: string, value: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_block", {
    p_kind: kind,
    p_value: value,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/blocklist");
  return { ok: true };
}

export async function removeBlock(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_block", { p_id: id });
  if (error) return { error: error.message };
  revalidatePath("/admin/blocklist");
  return { ok: true };
}

export async function blockUserIdentifiers(userId: string, reason: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_block_user_identifiers", {
    p_user: userId,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/blocklist");
  return { ok: true, count: data as number };
}