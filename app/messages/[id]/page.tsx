"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperclip,
  faMicrophone,
  faPaperPlane,
  faTrashCan,
  faXmark,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import { createClient } from "@/lib/supabase/client";
import OrderPanel from "@/components/OrderPanel";

config.autoAddCss = false;

type AttType = "image" | "file" | "audio";
type Msg = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  kind: string;
  attachment_path: string | null;
  attachment_type: AttType | null;
  attachment_name: string | null;
  attachment_size: number | null;
  audio_seconds: number | null;
};
type Conv = {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listings: { title: string; price: number; image_url: string | null } | null;
};
type Pending = { file: File; type: AttType; preview: string | null };

const MSG_COLS =
  "id, sender_id, body, created_at, read_at, kind, attachment_path, attachment_type, attachment_name, attachment_size, audio_seconds";
const BUCKET = "chat-attachments";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_VOICE_SECS = 120;
const ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtSize = (b: number | null) =>
  !b ? "" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

// body text used when the sender adds no caption; also what the inbox preview shows
function autoLabel(type: AttType | null, name: string | null, secs: number | null) {
  if (type === "image") return "📷 Photo";
  if (type === "audio") return `🎤 Voice note (${fmtTime(secs ?? 0)})`;
  return `📎 ${name ?? "File"}`;
}

export default function ThreadPage() {
  const supabase = createClient();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [me, setMe] = useState("");
  const [conv, setConv] = useState<Conv | null>(null);
  const [otherName, setOtherName] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // voice recording
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secsRef = useRef(0);

  const bodyRef = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);

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

  // sign URLs for any attachment we haven't signed yet (bucket is private)
  useEffect(() => {
    const need = [
      ...new Set(
        msgs.filter((m) => m.attachment_path && !urls[m.attachment_path]).map((m) => m.attachment_path as string)
      ),
    ];
    if (!need.length) return;
    let off = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(need, 6 * 60 * 60)
      .then(({ data }) => {
        if (off || !data) return;
        setUrls((prev) => {
          const next = { ...prev };
          for (const d of data) if (d.path && d.signedUrl) next[d.path] = d.signedUrl;
          return next;
        });
      });
    return () => { off = true; };
  }, [msgs]); // eslint-disable-line react-hooks/exhaustive-deps

  // scroll only the message list (not the whole page) to the newest message
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: firstScroll.current ? "auto" : "smooth" });
    if (msgs.length) firstScroll.current = false;
  }, [msgs.length]);

  // stop the mic if the user leaves mid-recording
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  function addMsg(m: Msg) {
    setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  }

  function clearPending() {
    setPending((p) => {
      if (p?.preview) URL.revokeObjectURL(p.preview);
      return null;
    });
  }

  function pickFile(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) return setErr("That file is too large. Max size is 10 MB.");
    setErr(null);
    clearPending();
    const isImg = f.type.startsWith("image/");
    setPending({ file: f, type: isImg ? "image" : "file", preview: isImg ? URL.createObjectURL(f) : null });
  }

  async function sendAttachment(file: File, type: AttType, caption: string, seconds?: number) {
    setSending(true);
    setErr(null);
    const ext =
      (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
    const path = `${id}/${me}/${crypto.randomUUID()}.${ext}`;
    const contentType = file.type.split(";")[0] || "application/octet-stream";

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType });
    if (upErr) { setSending(false); setErr(upErr.message); return false; }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        body: caption || autoLabel(type, file.name, seconds ?? null),
        attachment_path: path,
        attachment_type: type,
        attachment_name: file.name,
        attachment_size: file.size,
        audio_seconds: seconds ?? null,
      })
      .select(MSG_COLS)
      .single();
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      setSending(false);
      setErr(error.message);
      return false;
    }
    setSending(false);
    addMsg(data as Msg);
    return true;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending || recording) return;
    const body = text.trim();

    if (pending) {
      const ok = await sendAttachment(pending.file, pending.type, body);
      if (ok) { clearPending(); setText(""); }
      return;
    }

    if (!body) return;
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
    addMsg(data as Msg);
  }

  // ---------- voice notes ----------
  function pickMime() {
    // mp4/AAC first so iPhones can play it; webm as fallback
    const list = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    return list.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
  }

  function cleanupRec() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    setRecording(false);
    setSecs(0);
  }

  function stopRecorder(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const rec = recRef.current;
      if (!rec || rec.state === "inactive") return resolve(null);
      const mime = rec.mimeType;
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: mime }));
      rec.stop();
    });
  }

  async function startRecording() {
    setErr(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return setErr("Voice notes aren't supported on this browser.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.start();
      recRef.current = rec;
      secsRef.current = 0;
      setSecs(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        secsRef.current += 1;
        setSecs(secsRef.current);
        if (secsRef.current >= MAX_VOICE_SECS) sendRecording();
      }, 1000);
    } catch {
      cleanupRec();
      setErr("Microphone access is blocked. Allow it in your browser settings, then try again.");
    }
  }

  async function cancelRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    await stopRecorder();
    cleanupRec();
  }

  async function sendRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    const seconds = secsRef.current;
    const blob = await stopRecorder();
    cleanupRec();
    if (!blob || seconds < 1) return;
    const base = (blob.type || "audio/mp4").split(";")[0];
    const ext = base.includes("webm") ? "webm" : base.includes("ogg") ? "ogg" : "m4a";
    const file = new File([blob], `voice-note.${ext}`, { type: base });
    if (file.size > MAX_BYTES) return setErr("Voice note is too large.");
    await sendAttachment(file, "audio", "", seconds);
  }

  if (loading) return <p className="dp-meta" style={{ padding: 24 }}>Loading…</p>;
  if (!conv) return (
    <div className="dp-chat">
      <p className="dp-err">{err}</p>
      <Link href="/messages">← Back to messages</Link>
    </div>
  );

  const hasContent = !!text.trim() || !!pending;

  return (
    <div className="dp-chat">
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

      <div className="dp-chat-body" ref={bodyRef}>
        {msgs.length === 0 && <p className="dp-meta">Say hello 👋 Ask about the item, then arrange to meet.</p>}
        {msgs.map((m, i) => {
          if (m.kind === "system") return <div key={m.id} className="dp-sysmsg">{m.body}</div>;

          const url = m.attachment_path ? urls[m.attachment_path] : undefined;
          const showText =
            !m.attachment_type || m.body !== autoLabel(m.attachment_type, m.attachment_name, m.audio_seconds);
          const isLast = i === msgs.length - 1;

          return (
            <div
              key={m.id}
              className={`dp-bubble ${m.sender_id === me ? "is-mine" : "is-theirs"} ${
                m.attachment_type === "image" ? "has-img" : ""
              }`}
            >
              {m.attachment_type === "image" &&
                (url ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={m.attachment_name ?? "Photo"}
                      loading="lazy"
                      onLoad={() => {
                        const el = bodyRef.current;
                        if (isLast && el) el.scrollTop = el.scrollHeight;
                      }}
                    />
                  </a>
                ) : (
                  <div className="dp-att-ph" />
                ))}

              {m.attachment_type === "audio" &&
                (url ? (
                  <audio controls preload="metadata" src={url} />
                ) : (
                  <div className="dp-att-ph dp-att-ph-audio" />
                ))}

              {m.attachment_type === "file" && (
                <a className="dp-file" href={url} target="_blank" rel="noreferrer">
                  <FontAwesomeIcon icon={faFileLines} className="dp-file-ico" />
                  <span>
                    <strong>{m.attachment_name ?? "File"}</strong>
                    <small>{fmtSize(m.attachment_size)}</small>
                  </span>
                </a>
              )}

              {showText && <span>{m.body}</span>}
              <time>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            </div>
          );
        })}
      </div>

      <div className="dp-chat-compose">
        {err && <p className="dp-err" role="alert">{err}</p>}

        {pending && (
          <div className="dp-pending">
            {pending.preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pending.preview} alt="" />
            ) : (
              <span className="dp-pending-file">
                <FontAwesomeIcon icon={faFileLines} /> {pending.file.name}
              </span>
            )}
            <button type="button" className="dp-ico" aria-label="Remove attachment" onClick={clearPending}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}

        {recording ? (
          <div className="dp-chat-form dp-rec">
            <button type="button" className="dp-ico" aria-label="Cancel recording" onClick={cancelRecording}>
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
            <span className="dp-rec-dot" />
            <span className="dp-rec-time">{fmtTime(secs)}</span>
            <span className="dp-rec-hint">Recording…</span>
            <button
              type="button"
              className="dp-round"
              aria-label="Send voice note"
              onClick={sendRecording}
              disabled={sending}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        ) : (
          <form className="dp-chat-form" onSubmit={send}>
            <button
              type="button"
              className="dp-ico"
              aria-label="Attach a photo or file"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
            >
              <FontAwesomeIcon icon={faPaperclip} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              hidden
              onChange={(e) => {
                pickFile(e.target.files);
                e.target.value = "";
              }}
            />
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
              placeholder={pending ? "Add a caption…" : "Type a message…"}
              aria-label="Message"
            />
            {hasContent ? (
              <button type="submit" className="dp-round" aria-label="Send message" disabled={sending}>
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            ) : (
              <button
                type="button"
                className="dp-round"
                aria-label="Record a voice note"
                onClick={startRecording}
                disabled={sending}
              >
                <FontAwesomeIcon icon={faMicrophone} />
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}