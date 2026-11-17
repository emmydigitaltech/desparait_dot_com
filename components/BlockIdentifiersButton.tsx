"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { blockUserIdentifiers } from "@/app/admin/blocklist/actions";

export default function BlockIdentifiersButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function go() {
    const reason = prompt("Block this user's email and phone number?\nReason (internal):");
    if (!reason?.trim()) return;
    setBusy(true); setMsg("");
    const res = await blockUserIdentifiers(userId, reason);
    setBusy(false);
    if (res?.error) return setMsg(res.error);
    setMsg(`Blocked ${res.count} identifier(s).`);
    router.refresh();
  }

  return (
    <div>
      <button type="button" disabled={busy} onClick={go}
        style={{
          padding: "6px 10px", borderRadius: 6, fontSize: 13,
          border: "1px solid var(--dp-line)", background: "var(--dp-soft)", color: "var(--dp-fg)",
        }}>
        {busy ? "..." : "Block email/phone"}
      </button>
      {msg && <p style={{ fontSize: 12, marginTop: 4 }}>{msg}</p>}
    </div>
  );
}