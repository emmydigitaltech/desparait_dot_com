"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getIds, getServerIds, loadCart, setInCart, subscribe } from "@/lib/cartStore";
import CartIcon from "./CartIcon";

export default function QuickAddButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const inCart = useSyncExternalStore(subscribe, getIds, getServerIds).has(listingId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadCart(); }, []);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (inCart) {
      const { error } = await supabase.from("cart_items").delete().eq("listing_id", listingId);
      if (error) setError("Couldn't remove");
      else setInCart(listingId, false);
    } else {
      const { error } = await supabase.from("cart_items").insert({ listing_id: listingId });
      if (error && error.code !== "23505") {
        setError(error.message.includes("row-level security") ? "Can't add your own listing" : "Couldn't add");
      } else {
        setInCart(listingId, true);
      }
    }
    setBusy(false);
    router.refresh(); // updates the header count
    if (error) setTimeout(() => setError(null), 2000);
  }

  const label = error ?? (inCart ? "Remove from cart" : "Add to cart");

  return (
    <button
      type="button"
      className={`dp-quickadd ${inCart ? "is-added" : ""} ${error ? "is-error" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-label={label}
      title={label}
    >
      {inCart ? "✓" : <CartIcon size={16} />}
    </button>
  );
}