"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleSold() {
    setBusy(true);
    const { error } = await supabase
      .from("listings")
      .update({ status: status === "sold" ? "active" : "sold" })
      .eq("id", id);
    setBusy(false);
    if (error) return alert(error.message);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this listing? This can't be undone.")) return;
    setBusy(true);
    const { error } = await supabase.from("listings").delete().eq("id", id);
    setBusy(false);
    if (error) return alert(error.message);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button onClick={toggleSold} disabled={busy} className="btn-secondary">
        {status === "sold" ? "Relist" : "Mark sold"}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="btn-secondary !text-[#C40000]"
      >
        Delete
      </button>
    </div>
  );
}
