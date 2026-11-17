"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteReview, deleteReviewsBy } from "@/app/admin/reviews/actions";

export default function ReviewActions({
  reviewId,
  reviewerId,
  reviewerCount,
}: {
  reviewId: string;
  reviewerId: string;
  reviewerCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function one() {
    const reason = prompt("Delete this review?\nReason (sent to the reviewer):");
    if (!reason?.trim()) return;
    setBusy(true); setMsg("");
    const res = await deleteReview(reviewId, reason);
    setBusy(false);
    if (res?.error) return setMsg(res.error);
    router.refresh();
  }

  async function all() {
    const reason = prompt(`Delete ALL reviews by this user?\nReason (sent to the reviewer):`);
    if (!reason?.trim()) return;
    setBusy(true); setMsg("");
    const res = await deleteReviewsBy(reviewerId, reason);
    setBusy(false);
    if (res?.error) return setMsg(res.error);
    setMsg(`Deleted ${res.count} review(s).`);
    router.refresh();
  }

  const btn = {
    padding: "6px 10px", borderRadius: 6, fontSize: 13,
    border: "1px solid var(--dp-line)", background: "var(--dp-soft)", color: "var(--dp-fg)",
  } as const;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
      <button type="button" disabled={busy} onClick={one}
        style={{ ...btn, background: "#dc2626", color: "#fff", border: 0 }}>
        Delete review
      </button>
      {reviewerCount > 1 && (
        <button type="button" disabled={busy} onClick={all} style={btn}>
          Delete all by this reviewer
        </button>
      )}
      {msg && <span style={{ fontSize: 12, color: "#ef4444" }}>{msg}</span>}
    </div>
  );
}