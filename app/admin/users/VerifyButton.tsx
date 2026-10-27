"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVerified } from "./actions";

export default function VerifyButton({ userId, verified }: { userId: string; verified: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");

  function onClick() {
    setErr("");
    start(async () => {
      try {
        const res = await setVerified(userId, !verified);
        if (res?.error) setErr(res.error);
        else router.refresh();
      } catch (e: any) {
        setErr(e?.message ?? "Something went wrong");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          color: "#fff",
          background: verified ? "#b91c1c" : "#15803d",
          opacity: pending ? 0.6 : 1,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "..." : verified ? "Unverify" : "Verify"}
      </button>
      {err && <div style={{ color: "#e5484d", fontSize: 12, marginTop: 4 }}>{err}</div>}
    </>
  );
}