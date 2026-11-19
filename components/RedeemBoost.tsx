"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type L = { id: string; title: string; boosted_until: string | null };

const REWARDS: { days: 3 | 7; cost: number }[] = [
  { days: 3, cost: 100 },
  { days: 7, cost: 250 },
];

export default function RedeemBoost({ available, listings }: { available: number; listings: L[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [days, setDays] = useState<3 | 7>(3);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (listings.length === 0) {
    return <p className="dp-meta">You have no active listings to boost. Create a listing first, then come back.</p>;
  }

  const reward = REWARDS.find((r) => r.days === days)!;
  const listing = listings.find((l) => l.id === listingId);

  async function redeem() {
    setErr(null);
    setDone(null);
    if (!listing) return setErr("Choose a listing.");
    if (available < reward.cost) return setErr(`You need ${reward.cost} points for this reward.`);
    if (!window.confirm(`Spend ${reward.cost} points to boost "${listing.title}" for ${days} days?`)) return;

    setBusy(true);
    const { error } = await supabase.rpc("redeem_points_for_boost", {
      p_listing_id: listingId,
      p_days: days,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(`Done. "${listing.title}" is boosted for ${days} days.`);
    router.refresh();
  }

  return (
    <div className="dp-form">
      <div className="dp-reward-grid">
        {REWARDS.map((r) => (
          <button
            key={r.days}
            type="button"
            className={`dp-reward ${days === r.days ? "is-on" : ""}`}
            disabled={available < r.cost}
            onClick={() => setDays(r.days)}
          >
            <strong>{r.days}-day boost</strong>
            <br />
            <small>{r.cost} points</small>
          </button>
        ))}
      </div>

      <label>
        Listing to boost
        <select value={listingId} onChange={(e) => setListingId(e.target.value)}>
          {listings.map((l) => {
            const boosted = !!l.boosted_until && new Date(l.boosted_until).getTime() > Date.now();
            return (
              <option key={l.id} value={l.id}>
                {l.title}
                {boosted ? " (currently boosted)" : ""}
              </option>
            );
          })}
        </select>
      </label>

      {err && <p className="dp-err" role="alert">{err}</p>}
      {done && <p className="dp-ok">{done}</p>}

      <button type="button" className="dp-btn" disabled={busy || available < reward.cost} onClick={redeem}>
        {busy ? "Redeeming…" : `Redeem ${reward.cost} points`}
      </button>
      {available < reward.cost && (
        <small className="dp-meta">You need {reward.cost - available} more points for this reward.</small>
      )}
    </div>
  );
}