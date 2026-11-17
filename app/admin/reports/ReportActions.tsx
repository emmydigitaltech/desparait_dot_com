"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveReport } from "./actions";

export default function ReportActions({ id, hasListing }: { id: string; hasListing: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go(action: "dismiss" | "remove_listing" | "resolve") {
    if (action === "remove_listing" && !confirm("Remove this listing?")) return;
    setBusy(true); setErr("");
    const res = await resolveReport(id, action, note);
    setBusy(false);
    if (res?.error) return setErr(res.error);
    router.refresh();
  }

  const box = {
    padding: 10, borderRadius: 8, border: "1px solid var(--dp-line)",
    background: "var(--dp-soft)", color: "var(--dp-fg)",
  } as const;

  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      <input value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional, shown to the seller if you remove a listing)" style={box} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button disabled={busy} onClick={() => go("dismiss")} style={{ ...box, flex: 1 }}>Dismiss</button>
        {hasListing && (
          <button disabled={busy} onClick={() => go("remove_listing")}
            style={{ ...box, flex: 1, background: "#dc2626", color: "#fff", border: 0 }}>
            Remove listing
          </button>
        )}
        <button disabled={busy} onClick={() => go("resolve")}
          style={{ ...box, flex: 1, background: "#16a34a", color: "#fff", border: 0 }}>
          Resolved
        </button>
      </div>
      {err && <p style={{ color: "#ef4444", fontSize: 13 }}>{err}</p>}
    </div>
  );
}