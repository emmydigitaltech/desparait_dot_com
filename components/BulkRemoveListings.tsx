"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BulkRemoveListings({ userId, count }: { userId: string; count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function go() {
    const reason = prompt(`Remove all ${count} listing(s) from this user?\nReason (sent to the user):`);
    if (!reason?.trim()) return;
    setBusy(true); setMsg("");
    const { data, error } = await createClient().rpc("admin_bulk_remove_listings", {
      p_user: userId,
      p_reason: reason,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setMsg(`Removed ${data} listing(s).`);
    router.refresh();
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={go}
        style={{
          padding: "6px 10px", borderRadius: 6, fontSize: 13,
          border: "1px solid var(--dp-line)", background: "var(--dp-soft)", color: "var(--dp-fg)",
        }}>
        {busy ? "..." : "Remove listings"}
      </button>
      {msg && <p style={{ fontSize: 12, marginTop: 4 }}>{msg}</p>}
    </div>
  );
}