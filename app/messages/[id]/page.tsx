"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OrderPanel from "@/components/OrderPanel";

type Msg = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null; kind: string };
type Conv = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listings: { title: string; price: number; image_url: string | null } | null;
};

const MSG_COLS = "id, sender_id, body, created_at, read_at, kind";

export default function ThreadPage() {
  const supabase = createClient();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [me, setMe] = useState("");
  const [conv, setConv] = useState<Conv | null>(null);
  const [otherName, setOtherName] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function markRead(uid: string) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .neq("sender_id", uid)
      .is("read_at", null);
    router.refresh();
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace(`/login?next=/messages/${id}`);
      setMe(user.id);

      const { data: c, error } = await supabase
        .from("conversations")
        .select("id, buyer_id, seller_id, listing_id, listings(title, price, image_url)")
        .eq("id", id)
        .maybeSingle();
      if (error || !c) { setErr(error?.message ?? "Conversation not found."); setLoading(false); return; }
      const conv = c as unknown as Conv;
      setConv(conv);

      const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle(),
        supabase.from("messages").select(MSG_COLS).eq("conversation_id", id).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setOtherName(p?.full_name ?? "Student");
      setMsgs((m ?? []) as Msg[]);
      setLoading(false);
      markRead(user.id);

      channel = supabase
        .channel(`conv-${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
          (payload) => {
            const nm = payload.new as Msg;
            setMsgs((prev) => (prev.some((x) => x.id === nm.id) ? prev : [...prev, nm]));
            if (nm.sender_id !== user.id) markRead(user.id);
          }
        )
        .subscribe();
      if (cancelled) supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, body })
      .select(MSG_COLS)
      .single();
    setSending(false);
    if (error) return setErr(error.message);
    setText("");
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
  }

  if (loading) return <p className="dp-meta" style={{ padding: 24 }}>Loading…</p>;
  if (!conv) return (
    <main className="dp-chat">
      <p className="dp-err">{err}</p>
      <Link href="/messages">← Back to messages</Link>
    </main>
  );

  return (
    <main className="dp-chat">
      <div className="dp-chat-head">
        <Link href="/messages" aria-label="Back to messages">←</Link>
        {conv.listings?.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={conv.listings.image_url} alt="" />
        )}
        <div>
          <strong>{otherName}</strong>
          <Link href={`/listings/${conv.listing_id}`} className="dp-chat-listing">
            {conv.listings?.title ?? "Listing"}
            {conv.listings ? ` · ₦${conv.listings.price.toLocaleString()}` : ""}
          </Link>
        </div>
      </div>

      <OrderPanel
        conversationId={id}
        me={me}
        buyerId={conv.buyer_id}
        listingPrice={conv.listings?.price ?? 0}
      />

      <div className="dp-chat-body">
        {msgs.length === 0 && <p className="dp-meta">Say hello 👋 Ask about the item, then arrange to meet.</p>}
        {msgs.map((m) =>
          m.kind === "system" ? (
            <div key={m.id} className="dp-sysmsg">{m.body}</div>
          ) : (
            <div key={m.id} className={`dp-bubble ${m.sender_id === me ? "is-mine" : "is-theirs"}`}>
              {m.body}
              <time>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {err && <p className="dp-err" role="alert">{err}</p>}
      <form className="dp-chat-form" onSubmit={send}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Type a message…"
          aria-label="Message"
        />
        <button type="submit" className="dp-btn" disabled={sending || !text.trim()}>Send</button>
      </form>
    </main>
  );
}