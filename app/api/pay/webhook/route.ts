import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const raw = await req.text(); // raw body is required for the signature check
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!).update(raw).digest("hex");
  if (hash !== sig) return new Response("bad signature", { status: 401 });

  const event = JSON.parse(raw);
  if (event.event === "charge.success") {
    const { reference, amount, currency } = event.data;
    const admin = createAdminClient();
    const { data: p } = await admin.from("purchases")
      .select("amount_kobo,status").eq("reference", reference).single();
    if (p && p.status === "pending" && p.amount_kobo === amount && currency === "NGN") {
      await admin.rpc("fulfil_purchase", { p_reference: reference });
    }
  }
  return new Response("ok");
}