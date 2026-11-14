"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResolveButtons({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function resolve(resolution: "completed" | "cancelled", confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setErr(null);
    const { error } = await createClient().rpc("admin_resolve_order", {
      p_order_id: orderId,
      p_resolution: resolution,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }

  return (
    <div className="dp-dispute-actions">
      <button
        type="button"
        className="dp-btn"
        disabled={busy}
        onClick={() =>
          resolve("completed", "Confirm the seller WAS paid? This completes the order and marks the item sold.")
        }
      >
        Payment confirmed: complete
      </button>
      <button
        type="button"
        className="dp-btn-o"
        disabled={busy}
        onClick={() => resolve("cancelled", "Confirm NO payment was made? This cancels the order.")}
      >
        No payment: cancel
      </button>
      {err && <p className="dp-err" role="alert">{err}</p>}
    </div>
  );
}