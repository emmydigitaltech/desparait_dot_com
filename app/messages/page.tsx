"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Splash from "@/components/Splash";

type Conv = {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  listings: { title: string; image_url: string | null } | null;
};
type Msg = { conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

export default function InboxPage() {
  const supabase = createClient();
  const router = useRouter();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [last, setLast] = useState<Record<string, Msg>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [me, setMe] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login?next=/messages");
      setMe(user.id);

      const { data, error } = await supabase
        .from("conversations")
        .select("id, buyer_id, seller_id, last_message_at, listings(title, image_url)")
        .order("last_message_at", { ascending: false });
      if (error) { setErr(error.message); setLoading(false); return; }

      const rows = (data ?? []) as unknown as Conv[];
      setConvs(rows);

      if (rows.length) {
        const otherIds = [...new Set(rows.map((r) => (r.buyer_id === user.id ? r.seller_id : r.buyer_id)))];
        const [{ data: msgs }, { data: profs }] = await Promise.all([
          supabase
            .from("messages")
            .select("conversation_id, sender_id, body, created_at, read_at")
            .in("conversation_id", rows.map((r) => r.id))
            .order("created_at", { ascending: false })
            .limit(500),
          supabase.from("profiles").select("id, full_name").in("id", otherIds),
        ]);

        const lastMap: Record<string, Msg> = {};
        const unreadMap: Record<string, number> = {};
        for (const m of (msgs ?? []) as Msg[]) {
          if (!lastMap[m.conversation_id]) lastMap[m.conversation_id] = m;
          if (!m.read_at && m.sender_id !== user.id) {
            unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] ?? 0) + 1;
          }
        }
        setLast(lastMap);
        setUnread(unreadMap);
        setNames(Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name ?? "Student"])));
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

if (loading) return <Splash />;
  return (
    <main className="dp-inbox">
      <h1>Messages</h1>
      {err && <p className="dp-err" role="alert">{err}</p>}
      {convs.length === 0 ? (
        <p className="dp-meta">No conversations yet. Open a listing and tap “Message seller”.</p>
      ) : (
        <ul className="dp-inbox-list">
          {convs.map((c) => {
            const other = c.buyer_id === me ? c.seller_id : c.buyer_id;
            const m = last[c.id];
            const n = unread[c.id] ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className={`dp-inbox-row ${n ? "is-unread" : ""}`}>
                  {c.listings?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.listings.image_url} alt="" />
                  ) : (
                    <span className="dp-inbox-noimg" />
                  )}
                  <div className="dp-inbox-text">
                    <strong>{names[other] ?? "Student"}</strong>
                    <small>{c.listings?.title ?? "Listing removed"}</small>
                    <span>{m ? (m.sender_id === me ? "You: " : "") + m.body : "No messages yet"}</span>
                  </div>
                  {n > 0 && <span className="dp-cart-badge dp-inbox-badge">{n}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}