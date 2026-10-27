import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setVerified } from "./actions";

type SP = Promise<{ q?: string; filter?: string }>;

export default function AdminUsersPage({ searchParams }: { searchParams: SP }) {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <Suspense fallback={<p>Loading users...</p>}>
        <UsersList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function UsersList({ searchParams }: { searchParams: SP }) {
  await connection();
  const { q = "", filter = "all" } = await searchParams;

  // Admin guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles").select("role,is_admin").eq("id", user.id).single();
  if (!(me?.is_admin || me?.role === "admin")) redirect("/");

  // Data (service role, server-only)
  const admin = await createAdminClient();
  const [authRes, profRes, listRes, schoolRes] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id, full_name, school_id, campus, is_verified, role, is_admin"),
    admin.from("listings").select("seller_id"),
    admin.from("schools").select("id, name"), // ignored if the table doesn't exist
  ]);

  const schools = new Map<string, string>(
    (schoolRes.data ?? []).map((s: any) => [String(s.id), s.name])
  );
  const profiles = new Map<string, any>((profRes.data ?? []).map((p: any) => [p.id, p]));
  const counts = new Map<string, number>();
  for (const l of listRes.data ?? []) {
    counts.set(l.seller_id, (counts.get(l.seller_id) ?? 0) + 1);
  }

  let rows = (authRes.data?.users ?? []).map((u) => {
    const p = profiles.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      name: p?.full_name ?? "(no name)",
      school: (p?.school_id && schools.get(String(p.school_id))) || p?.campus || "-",
      joined: u.created_at,
      listings: counts.get(u.id) ?? 0,
      verified: !!p?.is_verified,
      admin: !!(p?.is_admin || p?.role === "admin"),
    };
  });

  const total = rows.length;
  const needle = q.trim().toLowerCase();
  if (needle) {
    rows = rows.filter(
      (r) => r.name.toLowerCase().includes(needle) || r.email.toLowerCase().includes(needle)
    );
  }
  if (filter === "verified") rows = rows.filter((r) => r.verified);
  if (filter === "unverified") rows = rows.filter((r) => !r.verified);
  rows.sort((a, b) => +new Date(b.joined) - +new Date(a.joined));

  const tab = (key: string, label: string) => (
    <Link
      key={key}
      href={`/admin/users?filter=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid var(--dp-line)",
        background: filter === key ? "var(--dp-soft)" : "transparent",
        color: "var(--dp-fg)",
        fontSize: 13,
      }}
    >
      {label}
    </Link>
  );

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        Users ({rows.length}
        {rows.length !== total ? ` of ${total}` : ""})
      </h1>

      <form method="get" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="hidden" name="filter" value={filter} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          style={{
            flex: 1, padding: 10, borderRadius: 8,
            border: "1px solid var(--dp-line)",
            background: "var(--dp-soft)", color: "var(--dp-fg)",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0 16px", borderRadius: 8,
            border: "1px solid var(--dp-line)",
            background: "var(--dp-soft)", color: "var(--dp-fg)",
          }}
        >
          Search
        </button>
      </form>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tab("all", "All")}
        {tab("verified", "Verified")}
        {tab("unverified", "Unverified")}
      </div>

      {rows.length === 0 && <p style={{ opacity: 0.7 }}>No users match.</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 720 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--dp-line)" }}>
              <th style={{ padding: 8 }}>User</th>
              <th style={{ padding: 8 }}>School</th>
              <th style={{ padding: 8 }}>Joined</th>
              <th style={{ padding: 8 }}>Listings</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--dp-line)" }}>
                <td style={{ padding: 8 }}>
                  <div style={{ fontWeight: 600 }}>
                    {r.name}
                    {r.admin && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>(admin)</span>}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{r.email}</div>
                </td>
                <td style={{ padding: 8 }}>{r.school}</td>
                <td style={{ padding: 8 }}>{new Date(r.joined).toISOString().slice(0, 10)}</td>
                <td style={{ padding: 8 }}>{r.listings}</td>
                <td style={{ padding: 8 }}>{r.verified ? "Verified" : "Unverified"}</td>
                <td style={{ padding: 8 }}>
                  <form action={setVerified}>
                    <input type="hidden" name="userId" value={r.id} />
                    <input type="hidden" name="verify" value={String(!r.verified)} />
                    <button
                      type="submit"
                      style={{
                        padding: "6px 12px", borderRadius: 6, color: "#fff",
                        background: r.verified ? "#b91c1c" : "#15803d",
                      }}
                    >
                      {r.verified ? "Unverify" : "Verify"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}