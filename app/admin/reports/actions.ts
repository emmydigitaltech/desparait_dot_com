"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function resolveReport(
  id: string,
  action: "dismiss" | "remove_listing" | "resolve",
  note: string
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report: id,
    p_action: action,
    p_note: note.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  return { ok: true };
}