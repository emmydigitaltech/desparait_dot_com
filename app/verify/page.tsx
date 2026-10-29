"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Req = { status: "pending" | "approved" | "rejected"; note: string | null };

function FileBox({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div>
      <span className="dp-vlabel">
        {label}
        <small>{hint}</small>
      </span>
      <label className={`dp-vdrop${file ? " has-file" : ""}`}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <span className="dp-vbtn">{file ? "Change" : "Choose file"}</span>
        <span className="dp-vname">{file ? file.name : "No file chosen"}</span>
      </label>
    </div>
  );
}

export default function VerifyPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [req, setReq] = useState<Req | null>(null);
  const [idCard, setIdCard] = useState<File | null>(null);
  const [headshot, setHeadshot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/");
    const { data: me } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("id", user.id)
      .single();
    setIsVerified(!!me?.is_verified);
    const { data: r } = await supabase
      .from("verification_requests")
      .select("status,note")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    setReq((r?.[0] as Req) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idCard || !headshot) return setErr("Please add both photos.");
    setBusy(true);
    setErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return router.replace("/");
    }

    const up = async (file: File, label: string) => {
      const path = `${user.id}/${label}-${crypto.randomUUID()}-${file.name.replace(/\s+/g, "_")}`;
      const { error } = await supabase.storage.from("verification-docs").upload(path, file);
      if (error) throw error;
      return path;
    };

    try {
      const id_card_path = await up(idCard, "id");
      const headshot_path = await up(headshot, "headshot");
      const { error } = await supabase
        .from("verification_requests")
        .insert({ user_id: user.id, id_card_path, headshot_path });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setErr(e.message ?? "Upload failed");
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="dp-mut">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="dp-vcard">
        <h1>Get verified</h1>
        <p className="dp-vsub">
          Verified sellers get a blue tick, which builds trust with buyers. Your documents are
          private and only reviewed by the Despariat team.
        </p>

        {isVerified ? (
          <p className="dp-vmsg ok">✔ You are a verified seller.</p>
        ) : req?.status === "pending" ? (
          <p className="dp-vmsg wait">
            Your request is pending review. We'll verify you soon.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            {req?.status === "rejected" && (
              <p className="dp-vmsg bad">
                Your last request was rejected{req.note ? `: ${req.note}` : "."} You can submit
                again.
              </p>
            )}
            <FileBox
              label="Current student ID card"
              hint="Clear photo, all text readable"
              file={idCard}
              onChange={setIdCard}
            />
            <FileBox
              label="Recent headshot"
              hint="Face clearly visible"
              file={headshot}
              onChange={setHeadshot}
            />
            {err && <p className="dp-vmsg bad">{err}</p>}
            <button disabled={busy} className="dp-vsubmit">
              {busy ? "Uploading..." : "Submit for verification"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}