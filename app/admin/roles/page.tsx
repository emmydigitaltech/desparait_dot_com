import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRole } from "@/lib/admin";
import RoleForm from "./RoleForm";

export default function RolesPage() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16 }}>
      <Suspense fallback={<p>Loading...</p>}>
        <Roles />
      </Suspense>
    </main>
  );
}

async function Roles() {
  await connection();
  if ((await getAdminRole()) !== "super_admin") redirect("/");

  const admin = await createAdminClient();
  const [rolesRes, authRes] = await Promise.all([
    admin.from("admin_roles").select("user_id, role, created_at").order("created_at"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const email = new Map((authRes.data?.users ?? []).map((u) => [u.id, u.email ?? u.id]));

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Admin roles</h1>
      <RoleForm />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--dp-line)" }}>
            <th style={{ padding: 8 }}>User</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Since</th>
          </tr>
        </thead>
        <tbody>
          {(rolesRes.data ?? []).map((r: any) => (
            <tr key={r.user_id} style={{ borderBottom: "1px solid var(--dp-line)" }}>
              <td style={{ padding: 8 }}>{email.get(r.user_id)}</td>
              <td style={{ padding: 8 }}>{r.role}</td>
              <td style={{ padding: 8 }}>{new Date(r.created_at).toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}