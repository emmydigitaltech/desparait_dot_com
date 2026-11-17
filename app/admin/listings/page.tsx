"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { can, type AdminRole } from "@/lib/admin-roles";

type Item = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string | null;
  condition: string | null;
  created_at: string;
  images: string[];
  seller: string;
};

export default function AdminListingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.replace("/");
    const { data: role } = await supabase.rpc("current_admin_role");
    if (!can(role as AdminRole | null, ["moderator"])) return router.replace("/");

    const { data: ls, error } = await supabase
      .from("listings")
      .select("id, seller_id, title, description, price, category, condition, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (error) { setErr(error.message); setLoading(false); return; }

    const ids = (ls ?? []).map((l) => l.id);
    const sellerIds = [...new Set((ls ?? []).map((l) => l.seller_id))];
    const [{ data: imgs }, { data: profs }] = await Promise.all([
      ids.length
        ? supabase.from("listing_images").select("listing_id, url, position").in("listing_id", ids).order("position")
        : Promise.resolve({ data: [] as any[] }),
      sellerIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", sellerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const names = new Map((profs ?? []).map((p: any) => [p.id, p.full_name ?? "Seller"]));
    setItems(
      (ls ?? []).map((l) => ({
        ...l,
        images: (imgs ?? []).filter((i: any) => i.listing_id === l.id).map((i: any) => i.url),
        seller: names.get(l.seller_id) ?? "Seller",
      }))
    );
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function decide(it: Item, approve: boolean) {
    setErr("");
    let note: string | null = null;
    if (!approve) {
      note = prompt("Reason for rejection (shown to the seller):") ?? "";
      if (!note) return;
    }
    setBusyId(it.id);
    const { error } = await supabase.rpc("admin_review_listing", {
      p_listing_id: it.id,
      p_approve: approve,
      p_note: note,
    });
    setBusyId(null);
    if (error) return setErr(error.message);
    setItems((l) => l.filter((x) => x.id !== it.id));
  }

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <nav className="mb-3 flex gap-4 text-sm">
        <Link href="/admin" className="underline">← Admin</Link>
      </nav>
      <h1 className="mb-4 text-xl font-bold">Pending listings ({items.length})</h1>
      {err && <p className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {items.length === 0 && <p className="text-gray-600">Nothing waiting for approval.</p>}
      <div className="flex flex-col gap-4">
        {items.map((it) => (
          <div key={it.id} className="rounded border bg-white p-4" style={{ color: "#111" }}>
            <p className="font-medium">{it.title} · ₦{it.price.toLocaleString()}</p>
            <p className="mb-2 text-xs text-gray-500">
              {it.seller} · {it.category?.replace(/-/g, " ")} · {it.condition} ·{" "}
              {new Date(it.created_at).toLocaleString()}
            </p>
            {it.description && <p className="mb-2 text-sm">{it.description}</p>}
            <p className="mb-1 text-xs text-gray-600">{it.images.length} photo(s)</p>
            <div className="grid grid-cols-4 gap-2">
              {it.images.map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="aspect-square w-full rounded border object-cover" />
                </a>
              ))}
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