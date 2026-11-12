"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StartChatButton({
  listingId,
  sellerId,
  className = "dp-btn",
  label = "Message seller",
}: {
  listingId: string;
  sellerId: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  if (me && me === sellerId) return null; // can't message yourself

  async function start() {
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .maybeSingle();

    let id = existing?.id as string | undefined;
    if (!id) {
      const { data, error } = await supabase
        .from("conversations")
        .insert({ listing_id: listingId, seller_id: sellerId })
        .select("id")
        .single();
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      id = data.id;
    }
    router.push(`/messages/${id}`);
  }

  return (
    <>
      <button type="button" className={className} onClick={start} disabled={busy}>
        {busy ? "Opening…" : label}
      </button>
      {err && <small className="dp-err" role="alert">{err}</small>}
    </>
  );
}