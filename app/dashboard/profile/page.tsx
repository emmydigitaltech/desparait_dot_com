"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveProfile } from "./actions";

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 512 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error("Could not process image"))), "image/jpeg", 0.85)
  );
}

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [campus, setCampus] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/");
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone, whatsapp, campus, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      setFullName(p?.full_name ?? "");
      setPhone(p?.phone ?? "");
      setWhatsapp(p?.whatsapp ?? "");
      setCampus(p?.campus ?? "");
      setAvatarUrl(p?.avatar_url ?? "");
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!file) return setPreview("");
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("full_name", fullName);
      fd.append("phone", phone);
      fd.append("whatsapp", whatsapp);
      fd.append("campus", campus);
      if (file) fd.append("avatar", await shrink(file), "avatar.jpg");
      const res = await saveProfile(fd);
      if (res?.error) {
        setErr(res.error);
        setBusy(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-4">
        <p className="dp-mut">Loading...</p>
      </main>
    );
  }

  const shown = preview || avatarUrl;

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="dp-vcard">
        <h1>Edit profile</h1>
        <p className="dp-vsub">Buyers see your name and photo on your listings.</p>

        <form onSubmit={save} className="dp-form">
          <div>
            <span className="dp-vlabel">Profile photo</span>
            <label className={`dp-vdrop${file ? " has-file" : ""}`}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shown}
                  alt="Avatar"
                  style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : null}
              <span className="dp-vbtn">{shown ? "Change" : "Choose file"}</span>
              <span className="dp-vname">{file ? file.name : "JPG or PNG"}</span>
            </label>
          </div>

          <label>
            Your name
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label>
            Phone number
            <input type="tel" placeholder="08012345678" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            WhatsApp number
            <input type="tel" placeholder="08012345678" value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)} />
          </label>
          <label>
            Campus
            <input placeholder="e.g. Main campus" value={campus}
              onChange={(e) => setCampus(e.target.value)} />
          </label>

          {err && <p className="dp-vmsg bad">{err}</p>}
          <button disabled={busy} className="dp-vsubmit">
            {busy ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </main>
  );
}