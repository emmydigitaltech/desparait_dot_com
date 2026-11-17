import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import VerifyButton from "./VerifyButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import UserModerationButtons from "@/components/UserModerationButtons";
import StrikeButton from "@/components/StrikeButton";
import { getAdminRole } from "@/lib/admin";
import { can } from "@/lib/admin-roles";
import BulkRemoveListings from "@/components/BulkRemoveListings";
import BlockIdentifiersButton from "@/components/BlockIdentifiersButton";

type SP = Promise<{ q?: string; filter?: string }>;
type Restriction = { status: "suspended" | "banned"; until: string | null; reason: string | null };

export default function AdminUsersPage({ searchParams }: { searchParams: SP }) {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
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
  const myRole = await getAdminRole();
  if (!can(myRole, ["moderator"])) redirect("/");

  // Data (service role, server-only)
  const admin = await createAdminClient();
  const strikeCutoff = new Date(Date.now() - 180 * 86400000).toISOString();
  const [authRes, profRes, listRes, schoolRes, restrRes, rolesRes, strikeRes] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id, full_name, school_id, campus, is_verified"),
    admin.from("listings").select("seller_id"),
    admin.from("schools").select("id, name"), // ignored if the table doesn't exist
    admin.from("user_restrictions").select("user_id, status, until, reason"),
    admin.from("admin_roles").select("user_id, role"),
    admin.from("strikes").select("user_id").is("revoked_at", null).gte("created_at", strikeCutoff),
  ]);

  const roleOf = new Map<string, string>(
    (rolesRes.data ?? []).map((r: any) => [r.user_id, r.role])
  );
  const strikeCount = new Map<string, number>();
  for (const s of strikeRes.data ?? []) {
    strikeCount.set(s.user_id, (strikeCount.get(s.user_id) ?? 0) + 1);
  }

  const now = new Date();
  const restrictionOf = new Map<string, Restriction>();
  for (const r of restrRes.data ?? []) {
    if (!r.until || new Date(r.until) > now) {
      restrictionOf.set(r.user_id, {
        status: r.status as "suspended" | "banned",
        until: r.until,
        reason: r.reason,
      });
    }
  }

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
      admin: roleOf.has(u.id),
      adminRole: roleOf.get(u.id) ?? "",
      strikes: strikeCount.get(u.id) ?? 0,
      restriction: restrictionOf.get(u.id) ?? null,
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
  if (filter === "suspended") rows = rows.filter((r) => r.restriction?.status === "suspended");
  if (filter === "banned") rows = rows.filter((r) => r.restriction?.status === "banned");
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

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {tab("all", "All")}
        {tab("verified", "Verified")}
        {tab("unverified", "Unverified")}
        {tab("suspended", "Suspended")}
        {tab("banned", "Banned")}
      </div>

      {rows.length === 0 && <p style={{ opacity: 0.7 }}>No users match.</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 900 }}>
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
                  <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {r.name}
                    {r.verified && <VerifiedBadge size={15} />}
                    {r.admin && <span style={{ fontSize: 11, opacity: 0.7 }}>({r.adminRole})</span>}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{r.email}</div>
                </td>
                <td style={{ padding: 8 }}>{r.school}</td>
                <td style={{ padding: 8 }}>{new Date(r.joined).toISOString().slice(0, 10)}</td>
                <td style={{ padding: 8 }}>{r.listings}</td>
                <td style={{ padding: 8 }}>
                  {r.restriction?.status === "banned" && (
                    <div style={{ color: "#ef4444", fontWeight: 700 }} title={r.restriction.reason ?? ""}>
                      Banned
                    </div>
                  )}
                  {r.restriction?.status === "suspended" && (
                    <div style={{ color: "#f59e0b", fontWeight: 700 }} title={r.restriction.reason ?? ""}>
                      Suspended
                      {r.restriction.until
                        ? ` until ${new Date(r.restriction.until).toISOString().slice(0, 10)}`
                        : ""}
                    </div>
                  )}
                  <div style={r.restriction ? { fontSize: 12, opacity: 0.7 } : undefined}>
                    {r.verified ? "Verified" : "Unverified"}
                  </div>
                  {r.strikes > 0 && (
                    <div style={{ fontSize: 12, color: "#f59e0b" }}>
                      {r.strikes} strike{r.strikes === 1 ? "" : "s"}
                    </div>
                  )}
                </td>
                <td style={{ padding: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <VerifyButton userId={r.id} verified={r.verified} />
                    {!r.admin && r.id !== user.id && (
                      <>
                        <UserModerationButtons
                          userId={r.id}
                          status={r.restriction?.status ?? "active"}
                        />
                        {r.restriction?.status !== "banned" && (
                          <StrikeButton userId={r.id} strikes={r.strikes} />
                        )
                        }
                        {myRole === "super_admin" && r.restriction?.status === "banned" && (
                          <BlockIdentifiersButton userId={r.id} />
                        )}
                        {r.listings > 0 && <BulkRemoveListings userId={r.id} count={r.listings} />
                        }
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}