"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ListingManage({
  listingId,
  title,
  status,
}: {
  listingId: string;
  title: string;
  status: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function restock() {
    const n = Math.floor(Number(qty));
    if (!n || n < 1) return setErr("Enter at least 1.");
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("restock_my_listing", { p_listing_id: listingId, p_stock: n });
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("delete_my_listing", { p_listing_id: listingId });
    setBusy(false);
    if (error) return setErr(error.message);
    router.refresh();
  }

  const canRestock = status === "active" || status === "sold";

  return (
    <>
      {canRestock && !open && (
        <button type="button" className="dp-btn-o" onClick={() => setOpen(true)}>
          {status === "sold" ? "Restock" : "Add stock"}
        </button>
      )}
      {open && (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="number"
            min="1"
            max="9999"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ width: 70 }}
            aria-label="Units to add"
          />
          <button type="button" className="dp-btn" disabled={busy} onClick={restock}>
            {busy ? "Saving…" : "Add"}
          </button>
          <button type="button" className="dp-link text-sm" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </span>
      )}
      <button type="button" className="dp-link text-sm" disabled={busy} onClick={remove}>
        Delete
      </button>
      {err && <span className="dp-err text-sm" role="alert">{err}</span>}
    </>
  );
}