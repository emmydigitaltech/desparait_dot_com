import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAccount } from "@/lib/paystack";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const number = req.nextUrl.searchParams.get("account_number") ?? "";
  const code = req.nextUrl.searchParams.get("bank_code") ?? "";
  if (!/^\d{10}$/.test(number) || !/^\d{3,8}$/.test(code)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const r = await resolveAccount(number, code);
  if (!r.ok) return NextResponse.json({ error: "Could not verify this account." }, { status: 422 });
  return NextResponse.json({ account_name: r.name });
}