"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { decideRequest } from "./actions";

type Item = {
  id: string;
  user_id: string;
  id_card_path: string;
  headshot_path: string;
  created_at: string;
  idUrl?: string;
  headUrl?: string;
  name: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/");

    const { data: me } = await supabase.from("profiles").select("role,is_admin").eq("id", user.id).single();
    if (!(me?.is_admin || me?.role === "admin")) return router.replace("/");

    const { data: reqs, error } = await supabase
      .from("verification_requests")
      .select("id,user_id,id_card_path,headshot_path,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) { setErr(error.message); setLoading(false); return; }

    const out: Item[] = [];
    for (const r of reqs ?? []) {
      const [a, b, p] = await Promise.all([
        supabase.storage.from("verification-docs").createSignedUrl(r.id_card_path, 600),
        supabase.storage.from("verification-docs").createSignedUrl(r.headshot_path, 600),
        supabase.from("profiles").select("*").eq("id", r.user_id).single(),
      ]);
      const prof: any = p.data;
      out.push({
        ...r,
        idUrl: a.data?.signedUrl,
        headUrl: b.data?.signedUrl,
        name: prof?.full_name ?? prof?.name ?? prof?.username ?? r.user_id.slice(0, 8),
      });
    }
    setItems(out);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function decide(it: Item, approve: boolean) {
    setBusyId(it.id); setErr("");
    let note: string | null = null;
    if (!approve) {
      note = prompt("Reason for rejection (shown to the user):") ?? "";
      if (!note) { setBusyId(null); return; }
    }
    try {
      const res = await decideRequest(it.id, approve, note);
      if (res?.error) { setErr(res.error); setBusyId(null); return; }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
      setBusyId(null);
      return;
    }
    setItems((l) => l.filter((x) => x.id !== it.id));
    setBusyId(null);
  }

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <a href="/admin/users" className="mb-3 inline-block text-sm underline">Manage users</a>
      <h1 className="mb-4 text-xl font-bold">Verification requests ({items.length})</h1>
      {err && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {items.length === 0 && <p className="text-gray-600">No pending requests.</p>}
      <div className="flex flex-col gap-4">
        {items.map((it) => (
          <div key={it.id} className="rounded border bg-white p-4" style={{ color: "#111" }}>
            <p className="mb-2 font-medium">
              {it.name}{" "}
              <span className="text-xs text-gray-500">{new Date(it.created_at).toLocaleString()}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs text-gray-600">ID card</p>
                {it.idUrl ? (
                  <a href={it.idUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.idUrl} alt="ID card" className="w-full rounded border" />
                  </a>
                ) : <p className="text-xs text-red-600">Can't load image</p>}
              </div>
              <div>
                <p className="mb-1 text-xs text-gray-600">Headshot</p>
                {it.headUrl ? (
                  <a href={it.headUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.headUrl} alt="Headshot" className="w-full rounded border" />
                  </a>
                ) : <p className="text-xs text-red-600">Can't load image</p>}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button disabled={busyId === it.id} onClick={() => decide(it, true)}
                className="flex-1 rounded bg-green-600 p-2 text-white disabled:opacity-50">Approve</button>
              <button disabled={busyId === it.id} onClick={() => decide(it, false)}
                className="flex-1 rounded bg-red-600 p-2 text-white disabled:opacity-50">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}