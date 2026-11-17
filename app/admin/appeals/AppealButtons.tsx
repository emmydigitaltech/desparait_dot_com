"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveAppeal } from "./actions";

export default function AppealButtons({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go(approve: boolean) {
    setBusy(true); setErr("");
    const res = await resolveAppeal(id, approve, note);
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
        placeholder="Note to the user (optional)" style={box} />
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={busy} onClick={() => go(true)}
          style={{ ...box, flex: 1, background: "#16a34a", color: "#fff", border: 0 }}>
          Approve
        </button>
        <button disabled={busy} onClick={() => go(false)}
          style={{ ...box, flex: 1, background: "#dc2626", color: "#fff", border: 0 }}>
          Reject
        </button>
      </div>
      {err && <p style={{ color: "#ef4444", fontSize: 13 }}>{err}</p>}
    </div>
  );
}