import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRole } from "@/lib/admin";
import { AddBlockForm, RemoveBlockButton } from "./BlockControls";

export default function BlocklistPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <Suspense fallback={<p>Loading...</p>}>
        <Blocklist />
      </Suspense>
    </main>
  );
}

async function Blocklist() {
  await connection();
  if ((await getAdminRole()) !== "super_admin") redirect("/");

  const admin = await createAdminClient();
  const { data } = await admin
    .from("blocklist")
    .select("id, kind, display, reason, created_at")
    .is("removed_at", null)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as any[];

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Block list ({rows.length})</h1>
      <AddBlockForm />
      {rows.length === 0 && <p style={{ opacity: 0.7 }}>Nothing blocked yet.</p>}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid var(--dp-line)" }}>
              <td style={{ padding: 8, textTransform: "capitalize" }}>{r.kind.replace("_", " ")}</td>
              <td style={{ padding: 8, fontFamily: "monospace" }}>{r.display}</td>
              <td style={{ padding: 8 }}>{r.reason}</td>
              <td style={{ padding: 8, fontSize: 12, opacity: 0.7 }}>
                {new Date(r.created_at).toISOString().slice(0, 10)}
              </td>
              <td style={{ padding: 8 }}><RemoveBlockButton id={r.id} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}