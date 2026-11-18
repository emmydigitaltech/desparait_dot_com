"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Splash from "@/components/Splash";

function Return() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const raw = sp.get("next") ?? "/dashboard";
    // only allow on-site paths
    const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
    // short pause so the webhook can finish before the page loads
    const t = setTimeout(() => router.replace(next), 1500);
    return () => clearTimeout(t);
  }, [sp, router]);

  return <Splash />;
}

export default function PayReturnPage() {
  return (
    <Suspense fallback={<Splash />}>
      <Return />
    </Suspense>
  );
}