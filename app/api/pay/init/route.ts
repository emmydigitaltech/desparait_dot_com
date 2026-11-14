import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin"; // use whatever admin.ts exports

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { productCode, listingId } = await req.json();
  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products").select("*").eq("code", productCode).eq("active", true).single();
  if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  if (String(productCode).startsWith("boost_")) {
    const { data: l } = await admin.from("listings").select("id")
      .eq("id", listingId).eq("seller_id", user.id).eq("status", "active").single();
    if (!l) return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const reference = `dsp_${crypto.randomUUID().replace(/-/g, "")}`;
  const { error } = await admin.from("purchases").insert({
    user_id: user.id, product_code: product.code,
    listing_id: listingId ?? null, amount_kobo: product.price_kobo, reference,
  });
  if (error) return NextResponse.json({ error: "Could not start payment" }, { status: 500 });

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: product.price_kobo,
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?paid=${reference}`,
    }),
  });
  const json = await res.json();
  if (!json.status) return NextResponse.json({ error: "Payment init failed" }, { status: 502 });
  return NextResponse.json({ url: json.data.authorization_url });
}