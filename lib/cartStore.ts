"use client";

import { createClient } from "@/lib/supabase/client";

let ids: Set<string> = new Set();
const EMPTY: Set<string> = new Set();
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function loadCart() {
  if (!loaded) {
    loaded = (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("cart_items").select("listing_id");
      ids = new Set((data ?? []).map((r) => r.listing_id as string));
    })().then(emit);
  }
  return loaded;
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export const getIds = () => ids;
export const getServerIds = () => EMPTY;

export function setInCart(id: string, inCart: boolean) {
  const next = new Set(ids);
  if (inCart) next.add(id); else next.delete(id);
  ids = next;
  emit();
}