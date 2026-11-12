"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BankDetailsForm from "@/components/BankDetailsForm";

export default function BankSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login?next=/settings/bank");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="dp-bank-page">
      <h1>Payout account</h1>
      <p className="dp-meta">Where buyers send your money after they inspect the item.</p>
      <BankDetailsForm />
    </main>
  );
}