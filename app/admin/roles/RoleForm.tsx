"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignRole } from "./actions";

export default function RoleForm({ presetEmail = "" }: { presetEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(presetEmail);
  const [role, setRole] = useState("moderator");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg("");
    const res = await assignRole(email, role);
    setMsg(res?.error ?? "Saved");
    setBusy(false);
    if (!res?.error) { setEmail(""); router.refresh(); }
  }

  const field = {
    padding: 10, borderRadius: 8, border: "1px solid var(--dp-line)",
    background: "var(--dp-soft)", color: "var(--dp-fg)",
  } as const;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      <input value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="User email" style={{ ...field, flex: 1, minWidth: 220 }} />
      <select value={role} onChange={(e) => setRole(e.target.value)} style={field}>
        <option value="moderator">Moderator</option>
        <option value="support">Support / finance</option>
        <option value="super_admin">Super admin</option>
        <option value="">Remove access</option>
      </select>
      <button onClick={submit} disabled={busy || !email.trim()} style={{ ...field, padding: "0 16px" }}>
        {busy ? "Saving..." : "Apply"}
      </button>
      {msg && <p style={{ width: "100%", fontSize: 13 }}>{msg}</p>}
    </div>
  );
}