"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 80);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 20);
  const whatsapp = String(formData.get("whatsapp") ?? "").trim().slice(0, 20);
  const campus = String(formData.get("campus") ?? "").trim().slice(0, 80);
  if (!full_name) return { error: "Name is required" };

  // Whitelist: only these fields can ever be written from this action
  const update: Record<string, string> = { full_name, phone, whatsapp, campus };

  const admin = createAdminClient();

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "Avatar must be an image" };
    if (file.size > 900_000) return { error: "Image is too large" };
    const path = `avatars/${user.id}-${Date.now()}.jpg`;
    const { error: upErr } = await admin.storage
      .from("listing-images")
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (upErr) return { error: upErr.message };
    update.avatar_url = admin.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await admin.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {};
}