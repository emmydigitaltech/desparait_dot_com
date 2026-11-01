'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Contact = { user_id: string; full_name: string | null; created_at: string };

export default function MarkSoldButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [choice, setChoice] = useState<string>(''); // user id, or 'none'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function openPanel() {
    setOpen(true); setErr('');
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_listing_contacts', { p_listing_id: listingId });
    if (error) return setErr(error.message);
    setContacts((data ?? []) as Contact[]);
  }

  async function confirm() {
    if (!choice) return setErr('Pick who bought it.');
    setBusy(true); setErr('');
    const supabase = createClient();
    const { error } = await supabase.rpc('mark_listing_sold', {
      p_listing_id: listingId,
      p_buyer_id: choice === 'none' ? null : choice,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={openPanel} className="dp-link shrink-0 text-sm">
        Mark sold
      </button>
    );
  }

  return (
    <div className="dp-panel" style={{ flexBasis: '100%', fontSize: 14 }}>
      <p style={{ fontWeight: 500, marginBottom: 6 }}>Who bought this?</p>
      <p className="dp-mut" style={{ fontSize: 13, marginBottom: 8 }}>
        Only the person you pick can review you for this listing.
      </p>

      <div style={{ display: 'grid', gap: 6 }}>
        {contacts.map((c) => (
          <label key={c.user_id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name={`buyer-${listingId}`}
              checked={choice === c.user_id}
              onChange={() => setChoice(c.user_id)}
            />
            {c.full_name ?? 'Student'}
            <span className="dp-mut" style={{ fontSize: 12 }}>
              chatted {new Date(c.created_at).toLocaleDateString()}
            </span>
          </label>
        ))}
        {contacts.length === 0 && (
          <p className="dp-mut" style={{ fontSize: 13 }}>
            Nobody has contacted you through the site for this listing yet.
          </p>
        )}
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="radio"
            name={`buyer-${listingId}`}
            checked={choice === 'none'}
            onChange={() => setChoice('none')}
          />
          Sold elsewhere (no review)
        </label>
      </div>

      {err && <p style={{ color: 'crimson', marginTop: 8 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="dp-btn" disabled={busy} onClick={confirm}>
          {busy ? 'Saving…' : 'Confirm sold'}
        </button>
        <button type="button" className="dp-link" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}