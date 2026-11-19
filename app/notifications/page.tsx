import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarkNotificationsRead from "@/components/MarkNotificationsRead";

type N = {
  id: string; kind: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
};

async function List() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("id,kind,title,body,link,read_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as N[];

  return (
    <>
      {items.length === 0 && <p style={{ opacity: 0.7 }}>No notifications yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((n) => (
          <div
            key={n.id}
            className="dp-panel"
            style={{ borderLeft: n.read_at ? undefined : "4px solid #ffd814" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>{n.title}</strong>
              <span className="dp-meta">
                {new Date(n.created_at).toLocaleString("en-NG", {
                  timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short",
                })}
              </span>
            </div>
            {n.body && <p style={{ whiteSpace: "pre-line", margin: "8px 0 0" }}>{n.body}</p>}
            {n.link && (
              <p style={{ margin: "10px 0 0" }}>
                <Link href={n.link} className="dp-link">
                  {n.link === "/appeal" ? "Appeal this decision" : "View"}
                </Link>
              </p>
            )}
          </div>
        ))}
      </div>
      {items.some((n) => !n.read_at) && <MarkNotificationsRead />}
    </>
  );
}

export default function NotificationsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h1 className="dp-h2" style={{ marginTop: 8 }}>Notifications</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <List />
      </Suspense>
    </main>
  );
}