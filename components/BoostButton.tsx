"use client";
import { useState } from "react";

export default function BoostButton({ listingId }: { listingId: string }) {
  const [busy, setBusy] = useState(false);
  async function pay(productCode: string) {
    setBusy(true);
    const r = await fetch("/api/pay/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode, listingId }),
    });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else { alert(j.error ?? "Payment failed"); setBusy(false); }
  }
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="dp-btn-o" disabled={busy} onClick={() => pay("boost_3d")}>Boost 3 days · ₦300</button>
      <button className="dp-btn-o" disabled={busy} onClick={() => pay("boost_7d")}>Boost 7 days · ₦700</button>
    </span>
  );
}