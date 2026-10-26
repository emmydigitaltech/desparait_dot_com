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
    if (!user) {
      setSaving(false);
      return router.replace("/");
    }

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
    <main className="dp-main">
      <div className="dp-auth">
        <h1>Set up your profile</h1>
        <p className="dp-meta">You&apos;ll only see listings from your school.</p>

        <form onSubmit={save} className="dp-form" style={{ marginTop: 20 }}>
          <label>
            Your name
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label>
            School
            <select
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">Select your school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            WhatsApp number
            <input
              required
              type="tel"
              placeholder="08012345678"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
            <span className="dp-meta" style={{ fontWeight: 400 }}>
              Buyers use this to message you about your listings.
            </span>
          </label>

          {error && <p className="dp-err">{error}</p>}

          <button className="dp-btn" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}