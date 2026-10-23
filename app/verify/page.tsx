"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Req = { status: "pending" | "approved" | "rejected"; note: string | null };

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
    const { data: me } = await supabase.from("profiles").select("is_verified").eq("id", user.id).single();
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

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idCard || !headshot) return setErr("Please add both photos.");
    setBusy(true); setErr("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/");

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

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="rounded border bg-white p-5">
        <h1 className="mb-1 text-xl font-bold">Get verified</h1>
        <p className="mb-4 text-sm text-gray-600">
          Verified sellers get a blue tick, which builds trust with buyers. Your documents are private and only reviewed by the Despariat team.
        </p>

        {isVerified ? (
          <p className="rounded bg-blue-50 p-3 text-blue-700">✔ You are a verified seller.</p>
        ) : req?.status === "pending" ? (
          <p className="rounded bg-yellow-50 p-3 text-yellow-800">
            Your request is pending review. We'll verify you soon.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {req?.status === "rejected" && (
              <p className="rounded bg-red-50 p-3 text-sm text-red-700">
                Your last request was rejected{req.note ? `: ${req.note}` : "."} You can submit again.
              </p>
            )}
            <label className="text-sm font-medium">
              Current student ID card (clear photo)
              <input type="file" accept="image/*" required className="mt-1 block w-full text-sm"
                onChange={(e) => setIdCard(e.target.files?.[0] ?? null)} />
            </label>
            <label className="text-sm font-medium">
              Recent headshot (face clearly visible)
              <input type="file" accept="image/*" required className="mt-1 block w-full text-sm"
                onChange={(e) => setHeadshot(e.target.files?.[0] ?? null)} />
            </label>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button disabled={busy} className="rounded bg-yellow-400 p-3 font-medium disabled:opacity-50">
              {busy ? "Uploading..." : "Submit for verification"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}