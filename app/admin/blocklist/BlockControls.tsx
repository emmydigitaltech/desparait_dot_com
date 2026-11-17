"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addBlock, removeBlock } from "./actions";

const box = {
  padding: 10, borderRadius: 8, border: "1px solid var(--dp-line)",
  background: "var(--dp-soft)", color: "var(--dp-fg)",
} as const;

const PLACEHOLDER: Record<string, string> = {
  phone: "0801 234 5678",
  email: "name@example.com",
  bank_account: "10-digit account number",
};

export function AddBlockForm() {
  const router = useRouter();
  const [kind, setKind] = useState("phone");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setBusy(true); setMsg("");
    const res = await addBlock(kind, value, reason);
    setBusy(false);
    if (res?.error) return setMsg(res.error);
    setValue(""); setReason(""); setMsg("Added");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      <select value={kind} onChange={(e) => setKind(e.target.value)} style={box}>
        <option value="phone">Phone number</option>
        <option value="email">Email</option>
        <option value="bank_account">Bank account number</option>
      </select>
      <input value={value} onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDER[kind]}
        style={{ ...box, flex: 1, minWidth: 180 }} />
      <input value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Reason" style={{ ...box, flex: 1, minWidth: 180 }} />
      <button type="button" disabled={busy || !value.trim() || !reason.trim()}
        onClick={submit} style={{ ...box, padding: "0 16px" }}>
        {busy ? "Adding..." : "Block"}
      </button>
      {msg && <p style={{ width: "100%", fontSize: 13 }}>{msg}</p>}
    </div>
  );
}

export function RemoveBlockButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!confirm("Remove this entry from the block list?")) return;
    setBusy(true); setErr("");
    const res = await removeBlock(id);
    setBusy(false);
    if (res?.error) return setErr(res.error);
    router.refresh();
  }

  return (
    <>
      <button type="button" disabled={busy} onClick={go}
        style={{ ...box, padding: "4px 10px", fontSize: 13 }}>
        {busy ? "..." : "Remove"}
      </button>
      {err && <span style={{ color: "#ef4444", fontSize: 12, marginLeft: 6 }}>{err}</span>}
    </>
  );
}