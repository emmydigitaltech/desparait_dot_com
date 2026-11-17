"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueStrike } from "@/app/admin/strikes/actions";

const OUTCOME: Record<string, string> = {
  warning: "Warning sent (strike 1).",
  suspended: "Suspended for 7 days (strike 2).",
  banned: "Banned (strike 3).",
  suspended_pending_ban: "Suspended indefinitely. A super admin needs to review and ban (strike 3).",
};

export default function StrikeButton({ userId, strikes }: { userId: string; strikes: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const next = strikes + 1;
  const preview =
    next === 1 ? "Sends a warning"
    : next === 2 ? "Suspends for 7 days"
    : "Third strike: ban";

  async function go() {
    setBusy(true); setMsg("");
    const res = await issueStrike(userId, reason);
    setBusy(false);
    if (res?.error) return setMsg(res.error);
    setMsg(OUTCOME[res.result ?? ""] ?? "Done.");
    setOpen(false); setReason("");
    router.refresh();
  }

  const box = {
    padding: "6px 10px", borderRadius: 6, border: "1px solid var(--dp-line)",
    background: "var(--dp-soft)", color: "var(--dp-fg)", fontSize: 13,
  } as const;

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => { setOpen(true); setMsg(""); }} style={box}>
          Strike ({strikes}/3)
        </button>
      ) : (
        <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (sent to the user)" style={box} />
          <p style={{ fontSize: 12, opacity: 0.75 }}>{preview}</p>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" disabled={busy || !reason.trim()} onClick={go}
              style={{ ...box, background: "#dc2626", color: "#fff", border: 0 }}>
              {busy ? "..." : "Issue strike"}
            </button>
            <button type="button" onClick={() => setOpen(false)} style={box}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <p style={{ fontSize: 12, marginTop: 4 }}>{msg}</p>}
    </div>
  );
}