import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBanks, resolveAccount } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const number = String(body?.account_number ?? "");
  const code = String(body?.bank_code ?? "");
  if (!/^\d{10}$/.test(number) || !/^\d{3,8}$/.test(code)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // never trust the client: re-resolve the name and look up the bank here
  const [banks, r] = await Promise.all([getBanks(), resolveAccount(number, code)]);
  const bank = banks.find((b) => b.code === code);
  if (!bank) return NextResponse.json({ error: "Unknown bank" }, { status: 400 });
  if (!r.ok) return NextResponse.json({ error: "Could not verify this account." }, { status: 422 });

  const { error } = await createAdminClient()
    .from("seller_bank_details")
    .upsert(
      {
        seller_id: user.id,
        bank_name: bank.name,
        account_number: number,
        account_name: r.name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "seller_id" }
    );
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });

  return NextResponse.json({ ok: true, bank_name: bank.name, account_name: r.name });
}
