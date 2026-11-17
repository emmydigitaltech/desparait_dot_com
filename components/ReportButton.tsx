"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REASONS: [string, string][] = [
  ["scam", "Scam or fraud"],
  ["fake", "Fake or misleading"],
  ["prohibited", "Prohibited item"],
  ["harassment", "Harassment or abuse"],
  ["wrong_category", "Wrong category"],
  ["other", "Something else"],
];

export default function ReportButton({
  type,
  targetId,
  label,
}: {
  type: "listing" | "user";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("scam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true); setMsg("");
    const supabase = createClient();
    const { error } = await supabase.rpc("submit_report", {
      p_type: type,
      p_target: targetId,
      p_reason: reason,
      p_details: details.trim() || null,
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setDone(true);
  }

  const box = {
    padding: 8, borderRadius: 8, border: "1px solid var(--dp-line)",
    background: "var(--dp-soft)", color: "var(--dp-fg)", width: "100%",
  } as const;

  if (done) return <p style={{ fontSize: 13, opacity: 0.8 }}>Thanks, we'll review your report.</p>;

  return (
    <div style={{ fontSize: 13 }}>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          style={{ background: "none", border: 0, color: "var(--dp-fg)", opacity: 0.7, textDecoration: "underline", cursor: "pointer" }}>
          {label ?? (type === "listing" ? "Report listing" : "Report user")}
        </button>
      ) : (
        <div style={{ display: "grid", gap: 8, maxWidth: 360, marginTop: 6 }}>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={box}>
            {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)}
            maxLength={1000} rows={3} placeholder="Details (optional)" style={box} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={busy} onClick={submit}
              style={{ ...box, width: "auto", padding: "8px 14px" }}>
              {busy ? "Sending..." : "Submit report"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              style={{ ...box, width: "auto", padding: "8px 14px" }}>Cancel</button>
          </div>
          {msg && <p style={{ color: "#ef4444" }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}