import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRole } from "@/lib/admin";
import { can } from "@/lib/admin-roles";
import AppealButtons from "./AppealButtons";

export default function AppealsPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <Suspense fallback={<p>Loading appeals...</p>}>
        <Appeals />
      </Suspense>
    </main>
  );
}

async function Appeals() {
  await connection();
  const role = await getAdminRole();
  if (!can(role, ["moderator"])) redirect("/");

  const admin = await createAdminClient();
  const { data: appeals } = await admin
    .from("appeals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const ids = (appeals ?? []).map((a: any) => a.user_id);
  const [{ data: profs }, { data: restr }, authRes] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", ids.length ? ids : [""]),
    admin.from("user_restrictions").select("user_id, status, reason, until").in("user_id", ids.length ? ids : [""]),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const name = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
  const rs = new Map((restr ?? []).map((r: any) => [r.user_id, r]));
  const email = new Map((authRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Appeals ({appeals?.length ?? 0})
      </h1>
      {(appeals ?? []).length === 0 && <p style={{ opacity: 0.7 }}>No pending appeals.</p>}
      <div style={{ display: "grid", gap: 12 }}>
        {(appeals ?? []).map((a: any) => {
          const r: any = rs.get(a.user_id);
          const text = a.message ?? a.reason ?? a.body ?? a.text ?? a.note ?? "";
          return (
            <div key={a.id} style={{ border: "1px solid var(--dp-line)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontWeight: 600 }}>{name.get(a.user_id) ?? "(no name)"}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {email.get(a.user_id)} · {new Date(a.created_at).toISOString().slice(0, 10)}
              </div>
              {r && (
                <p style={{ fontSize: 13, marginTop: 8, opacity: 0.8 }}>
                  Restriction: {r.status}{r.reason ? ` (${r.reason})` : ""}
                </p>
              )}
              <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{text || "(no message)"}</p>
              <AppealButtons id={a.id} />
            </div>
          );
        })}
      </div>
    </>
  );
}