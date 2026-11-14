import { NextResponse } from "next/server";
import { getBanks } from "@/lib/paystack";

export async function GET() {
  return NextResponse.json({ banks: await getBanks() });
}