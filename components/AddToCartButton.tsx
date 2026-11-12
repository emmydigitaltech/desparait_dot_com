"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CartIcon from "./CartIcon";

export default function AddToCartButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "busy" | "added">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    setState("busy");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (state === "added")
  return (
    <Link href="/cart" className="dp-btn-o dp-icon-btn">
      <CartIcon /> Added ✓ View cart
    </Link>
  );

    return (
    <>
        <button type="button" className="dp-btn dp-icon-btn" onClick={add} disabled={state === "busy"}>
        <CartIcon /> {state === "busy" ? "Adding…" : "Add to cart"}
        </button>
        {err && <p className="dp-err" role="alert">{err}</p>}
    </>
    );
    setState("added");
    router.refresh(); // updates the header count
  }

  if (state === "added")
    return <Link href="/cart" className="dp-btn-o">Added ✓ View cart</Link>;

  return (
    <>
      <button type="button" className="dp-btn" onClick={add} disabled={state === "busy"}>
        {state === "busy" ? "Adding…" : "Add to cart"}
      </button>
      {err && <p className="dp-err" role="alert">{err}</p>}
    </>
  );
}