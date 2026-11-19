import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import SellerAnalytics, { type AnalyticsData } from "@/components/SellerAnalytics";
import Splash from "@/components/Splash";

async function Sales() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fdashboard%2Fsales");

  const { data, error } = await supabase.rpc("get_seller_analytics");
  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="dp-err">Could not load your sales: {error?.message ?? "no data"}</p>
      </main>
    );
  }
  return <SellerAnalytics data={data as AnalyticsData} />;
}

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <Sales />
    </Suspense>
  );
}