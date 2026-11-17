"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteReview(id: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_review", {
    p_review: id,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true };
}

export async function deleteReviewsBy(reviewerId: string, reason: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_delete_reviews_by_reviewer", {
    p_reviewer: reviewerId,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true, count: data as number };
}