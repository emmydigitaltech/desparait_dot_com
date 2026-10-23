"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type School = { id: string; name: string };

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.replace("/");

      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("schools").select("id, name").order("name"),
        supabase
          .from("profiles")
          .select("school_id, full_name, whatsapp")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      setSchools(s ?? []);
      if (p?.school_id) return router.replace("/browse");
      setFullName(p?.full_name ?? user.user_metadata?.full_name ?? "");
      setWhatsapp(p?.whatsapp ?? "");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.replace("/");

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      school_id: schoolId,
      full_name: fullName.trim(),
      whatsapp: whatsapp.trim(),
    });
    setSaving(false);
    if (error) return setError(error.message);
    router.replace("/browse");
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Set up your profile</h1>
      <p className="mt-1 text-gray-600">
        You'll only see listings from your school.
      </p>

      <form onSubmit={save} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2.5"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">School</span>
          <select
            required
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2.5"
          >
            <option value="">Select your school</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">WhatsApp number</span>
          <input
            required
            type="tel"
            placeholder="08012345678"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className="mt-1 w-full rounded-lg border p-2.5"
          />
          <span className="text-xs text-gray-500">
            Buyers use this to message you about your listings.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          disabled={saving}
          className="w-full rounded-lg bg-black p-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </form>
    </main>
  );
}
