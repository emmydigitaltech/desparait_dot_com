"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";

export default function AvatarUploader({
  userId,
  url,
  name,
}: {
  userId: string;
  url?: string | null;
  name?: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [preview, setPreview] = useState(url ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Please choose an image.");
    if (file.size > 3 * 1024 * 1024) return setError("Image must be under 3 MB.");

    setBusy(true);
    try {
      const path = `${userId}/avatar`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`; // bust the cache on replace

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      setPreview(publicUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dp-avatar-up">
      <Avatar url={preview} name={name} size={72} />
      <div>
        <label className="dp-btn-o dp-avatar-pick">
          {busy ? "Uploading..." : preview ? "Change photo" : "Upload photo"}
          <input type="file" accept="image/*" onChange={onPick} disabled={busy} hidden />
        </label>
        {error && <p className="dp-err">{error}</p>}
      </div>
    </div>
  );
}