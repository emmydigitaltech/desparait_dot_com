import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppealForm from "./AppealForm";

async function Content() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: r } = await supabase
    .from("user_restrictions").select("status,reason,until").eq("user_id", user.id).maybeSingle();
  const active = !!r && (!r.until || new Date(r.until) > new Date());

  const { data: last } = await supabase
    .from("appeals").select("status,admin_note,created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!r || !active || r.status !== "suspended") {
    return <p>Your account is in good standing. There is nothing to appeal.</p>;
  }

  const until = r.until
    ? new Date(r.until).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "long", timeStyle: "short" })
    : null;

  return (
    <>
      <div className="dp-panel" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0 }}><strong>Your account is suspended.</strong></p>
        <p style={{ margin: "6px 0 0" }}>Reason: {r.reason || "Not specified"}</p>
        <p style={{ margin: "6px 0 0" }}>{until ? `Until: ${until} (WAT)` : "Duration: until further notice"}</p>
      </div>

      {last?.status === "pending" ? (
        <div className="dp-panel">Your appeal is under review. You will get a notification when it is decided.</div>
      ) : (
        <>
          {last?.status === "rejected" && (
            <p style={{ marginBottom: 12 }}>
              Your last appeal was not approved{last.admin_note ? `: ${last.admin_note}` : "."} You can send a new one.
            </p>
          )}
          <AppealForm />
        </>
      )}
    </>
  );
}

export default function AppealPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
      <h1 className="dp-h2" style={{ marginTop: 8 }}>Appeal a suspension</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <Content />
      </Suspense>
    </main>
  );
}