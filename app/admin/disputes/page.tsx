import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRole } from "@/lib/admin";
import { can } from "@/lib/admin-roles";
import ResolveButtons from "@/components/ResolveButtons";
import Splash from "@/components/Splash";

type Order = {
  id: string;
  title: string;
  price: number;
  buyer_id: string;
  seller_id: string;
  conversation_id: string;
  updated_at: string;
};
type Msg = { conversation_id: string; sender_id: string; body: string; created_at: string; kind: string };
type Person = { full_name: string | null; whatsapp: string | null };

function waHref(raw: string | null) {
  if (!raw) return null;
  let n = raw.replace(/\D/g, "");
  if (n.startsWith("0")) n = "234" + n.slice(1);
  return `https://wa.me/${n}`;
}

function PersonLine({ label, p }: { label: string; p?: Person }) {
  const href = waHref(p?.whatsapp ?? null);
  return (
    <span>
      <b>{label}:</b> {p?.full_name ?? "Unknown"}{" "}
      {href && <a href={href} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
    </span>
  );
}

async function Loader() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/disputes");

  const role = await getAdminRole();
  if (!can(role, ["support"])) redirect("/");

  // role verified above; read with the service role so support staff
  // don't depend on per-table RLS policies
  const admin = await createAdminClient();

  const { data: orders } = await admin
    .from("orders")
    .select("id, title, price, buyer_id, seller_id, conversation_id, updated_at")
    .eq("status", "disputed")
    .order("updated_at", { ascending: true });
  const list = (orders ?? []) as Order[];

  let people: Record<string, Person> = {};
  const byConv: Record<string, Msg[]> = {};
  if (list.length) {
    const ids = [...new Set(list.flatMap((o) => [o.buyer_id, o.seller_id]))];
    const [{ data: profs }, { data: msgs }] = await Promise.all([
      admin.from("profiles").select("id, full_name, whatsapp").in("id", ids),
      admin
        .from("messages")
        .select("conversation_id, sender_id, body, created_at, kind")
        .in("conversation_id", list.map((o) => o.conversation_id))
        .order("created_at", { ascending: true })
        .limit(1000),
    ]);
    people = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, { full_name: p.full_name, whatsapp: p.whatsapp }])
    );
    for (const m of (msgs ?? []) as Msg[]) (byConv[m.conversation_id] ||= []).push(m);
  }

  return (
    <main className="dp-disputes">
      <h1>Disputes</h1>
      {list.length === 0 ? (
        <p className="dp-meta">No open disputes.</p>
      ) : (
        list.map((o) => (
          <section key={o.id} className="dp-dispute">
            <div className="dp-dispute-head">
              <strong>{o.title} · ₦{o.price.toLocaleString()}</strong>
              <small>Reported {new Date(o.updated_at).toLocaleString()}</small>
            </div>
            <div className="dp-dispute-people">
              <PersonLine label="Buyer" p={people[o.buyer_id]} />
              <PersonLine label="Seller" p={people[o.seller_id]} />
            </div>

            <div className="dp-dispute-chat">
              {(byConv[o.conversation_id] ?? []).map((m, i) => {
                if (m.kind === "system") return <div key={i} className="dp-sysmsg">{m.body}</div>;
                const who = m.sender_id === o.buyer_id ? "Buyer" : m.sender_id === o.seller_id ? "Seller" : "Admin";
                return (
                  <p key={i}>
                    <b>{who}:</b> {m.body}
                  </p>
                );
              })}
            </div>

            <ResolveButtons orderId={o.id} />
          </section>
        ))
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <Loader />
    </Suspense>
  );
}