const BASE = "https://api.paystack.co";
const authHeaders = () => ({ Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` });

export type Bank = { name: string; code: string };

export async function getBanks(): Promise<Bank[]> {
  if (!process.env.PAYSTACK_SECRET_KEY) return [];
  const out: Bank[] = [];
  let cursor: string | null = null;

  for (let i = 0; i < 10; i++) {
    const url = new URL(`${BASE}/bank`);
    url.searchParams.set("currency", "NGN");
    url.searchParams.set("perPage", "100");
    url.searchParams.set("use_cursor", "true");
    if (cursor) url.searchParams.set("next", cursor);

    const res = await fetch(url, { headers: authHeaders(), next: { revalidate: 86400 } });
    if (!res.ok) break;
    const json = await res.json();
    for (const b of json.data ?? []) {
      if (b.active !== false && b.code && b.name) out.push({ name: b.name, code: b.code });
    }
    cursor = json.meta?.next ?? null;
    if (!cursor) break;
  }

  const seen = new Set<string>();
  return out
    .filter((b) => (seen.has(b.code) ? false : (seen.add(b.code), true)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<{ ok: true; name: string } | { ok: false }> {
  if (!process.env.PAYSTACK_SECRET_KEY) return { ok: false };
  const url = new URL(`${BASE}/bank/resolve`);
  url.searchParams.set("account_number", accountNumber);
  url.searchParams.set("bank_code", bankCode);

  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) return { ok: false };
  const json = await res.json();
  const name = json?.data?.account_name;
  return name ? { ok: true, name } : { ok: false };
}