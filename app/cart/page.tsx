"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setInCart } from "@/lib/cartStore";
import StartChatButton from "@/components/StartChatButton";
import Splash from "@/components/Splash";


type Item = {
  id: string;
  listings: { id: string; title: string; price: number; image_url: string | null; seller_id: string } | null;
};

function waNumber(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.startsWith("0") ? "234" + d.slice(1) : d;
}

export default function CartPage() {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [phones, setPhones] = useState<Record<string, { name: string | null; whatsapp: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login?next=/cart");

      const { data, error } = await supabase
        .from("cart_items")
        .select("id, listings(id, title, price, image_url, seller_id)")
        .order("created_at", { ascending: false });
      if (error) { setErr(error.message); setLoading(false); return; }

      const rows = (data ?? []) as unknown as Item[];
      setItems(rows);

      const sellerIds = [...new Set(rows.map((r) => r.listings?.seller_id).filter(Boolean))] as string[];
      if (sellerIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, whatsapp").in("id", sellerIds);
        setPhones(Object.fromEntries((profs ?? []).map((p) => [p.id, { name: p.full_name, whatsapp: p.whatsapp }])));
      }
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(item: Item) {
    const { error } = await supabase.from("cart_items").delete().eq("id", item.id);
    if (error) return setErr(error.message);
    if (item.listings) setInCart(item.listings.id, false);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    router.refresh();
  }

  if (loading) return <p className="dp-meta" style={{ padding: 24 }}>if (loading) return <Splash />;</p>;

  const valid = items.filter((i) => i.listings);
  const total = valid.reduce((s, i) => s + i.listings!.price, 0);
  const bySeller = valid.reduce<Record<string, Item[]>>((acc, i) => {
    (acc[i.listings!.seller_id] ||= []).push(i);
    return acc;
  }, {});

  return (
    <main className="dp-cart">
      <h1>Your cart</h1>
      {err && <p className="dp-err" role="alert">{err}</p>}
      {valid.length === 0 ? (
        <p className="dp-meta">Your cart is empty. <Link href="/browse">Browse listings</Link></p>
      ) : (
        <>
          {Object.entries(bySeller).map(([sellerId, rows]) => {
            const seller = phones[sellerId];
            const sub = rows.reduce((s, r) => s + r.listings!.price, 0);
            const msg =
              `Hi${seller?.name ? " " + seller.name : ""}, I'm interested in these on Despariat:\n` +
              rows.map((r) => `• ${r.listings!.title} (₦${r.listings!.price.toLocaleString()})`).join("\n");
            return (
              <section key={sellerId} className="dp-cart-group">
                <h2 className="dp-cart-seller">{seller?.name ?? "Seller"}</h2>
                {rows.map((r) => (
                  <div key={r.id} className="dp-cart-row">
                    {r.listings!.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.listings!.image_url} alt="" />
                    )}
                    <Link href={`/listings/${r.listings!.id}`} className="dp-cart-title">{r.listings!.title}</Link>
                    <span>₦{r.listings!.price.toLocaleString()}</span>
                    <button type="button" className="dp-btn-o" onClick={() => remove(r)}>Remove</button>
                  </div>
                ))}
                <div className="dp-cart-sub">
                  <span>Subtotal ₦{sub.toLocaleString()}</span>
                  <StartChatButton
                    listingId={rows[0].listings!.id}
                    sellerId={sellerId}
                    className="dp-btn"
                    label="Message seller"
                    />
                </div>
              </section>
            );
          })}
          <p className="dp-cart-total">Total: ₦{total.toLocaleString()}</p>
        </>
      )}
    </main>
  );
}