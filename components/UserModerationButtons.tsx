"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "active" | "suspended" | "banned";

export default function UserModerationButtons({ userId, status }: { userId: string; status: Status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(action: "suspend" | "ban" | "restore") {
    let reason: string | null = null;
    let days: number | null = null;

    if (action !== "restore") {
      reason = window.prompt(`Reason for ${action === "ban" ? "ban" : "suspension"} (shown to the user):`);
      if (reason === null) return;
      if (action === "suspend") {
        const d = window.prompt("Suspend for how many days? Leave empty for indefinite.", "7");
        if (d === null) return;
        days = d.trim() ? Number(d) : null;
        if (days !== null && (!Number.isFinite(days) || days <= 0)) return alert("Enter a valid number of days");
      } else if (!window.confirm("Ban permanently? They will be signed out and cannot log in.")) {
        return;
      }
    }

    setBusy(true);
    const res = await fetch("/api/admin/users/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, reason, days }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return alert(j.error ?? "Failed");
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {status === "active" && (
        <button className="dp-btn-o" disabled={busy} onClick={() => run("suspend")}>Suspend</button>
      )}
      {status !== "banned" && (
        <button className="dp-btn-o" disabled={busy} onClick={() => run("ban")}>Ban</button>
      )}
      {status !== "active" && (
        <button className="dp-btn-o" disabled={busy} onClick={() => run("restore")}>
          {status === "banned" ? "Unban" : "Lift suspension"}
        </button>
      )}
    </span>
  );
}