"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AppealForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j.error ?? "Could not send your appeal");
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <label style={{ fontWeight: 600 }}>
        Why should we lift your suspension?
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={1000}
          required
          minLength={10}
          style={{
            width: "100%", marginTop: 6, padding: 10, borderRadius: 8,
            border: "1px solid var(--dp-line)", background: "var(--dp-soft)",
            color: "var(--dp-fg)", font: "inherit",
          }}
        />
      </label>
      {error && <p className="dp-err">{error}</p>}
      <button className="dp-btn" disabled={busy} style={{ justifySelf: "start" }}>
        {busy ? "Sending..." : "Send appeal"}
      </button>
    </form>
  );
}