import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const { message } = await req.json();
  if (typeof message !== "string" || message.trim().length < 10 || message.length > 1000) {
    return NextResponse.json({ error: "Write between 10 and 1000 characters" }, { status: 400 });
  }

  const { error } = await supabase.rpc("submit_appeal", { p_message: message });
  if (error) {
    const dup = error.message.includes("appeals_one_pending");
    return NextResponse.json(
      { error: dup ? "You already have an appeal under review" : error.message },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}