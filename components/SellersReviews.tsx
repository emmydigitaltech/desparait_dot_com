'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  listing_id: string | null;
};

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function SellerReviews({
  sellerId,
  listingId,
}: {
  sellerId: string;
  listingId: string;
}) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [eligible, setEligible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: rows }, { data: auth }, { data: lst }] = await Promise.all([
      supabase
        .from('seller_reviews')
        .select('id, rating, comment, created_at, reviewer_id, listing_id')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.auth.getUser(),
      supabase.from('listings').select('status, sold_to').eq('id', listingId).maybeSingle(),
    ]);
    const list = (rows ?? []) as Review[];
    setReviews(list);
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    setEligible(!!uid && lst?.status === 'sold' && lst?.sold_to === uid);

    const ids = [...new Set(list.map((r) => r.reviewer_id))];
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { if (p.full_name) map[p.id] = p.full_name; });
      setNames(map);
    }
  }, [sellerId, listingId]);

  useEffect(() => { load(); }, [load]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const alreadyReviewed = reviews.some(
    (r) => r.reviewer_id === userId && r.listing_id === listingId
  );
  const isSeller = userId === sellerId;
  const canReview = eligible && !isSeller && !alreadyReviewed;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return router.push('/login');
    if (rating < 1) return setErr('Pick a star rating.');
    setBusy(true); setErr('');
    const supabase = createClient();
    const { error } = await supabase.from('seller_reviews').insert({
      seller_id: sellerId,
      reviewer_id: userId,
      listing_id: listingId,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(
        error.code === '23505'
          ? 'You already reviewed this listing.'
          : error.code === '42501'
          ? 'Only the buyer the seller confirmed can review.'
          : error.message
      );
      return;
    }
    setRating(0); setComment('');
    load();
  }

  return (
    <section className="dp-panel" style={{ marginTop: 24 }}>
      <h2 className="font-medium">
        Seller reviews{' '}
        {reviews.length > 0 && (
          <span className="dp-mut" style={{ fontWeight: 400, fontSize: 14 }}>
            {avg.toFixed(1)} ★ · {reviews.length} review{reviews.length > 1 ? 's' : ''}
          </span>
        )}
      </h2>

      {reviews.length === 0 && (
        <p className="dp-mut" style={{ fontSize: 14, marginTop: 8 }}>No reviews yet.</p>
      )}

      <ul style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        {reviews.map((r) => (
          <li key={r.id} style={{ borderTop: '1px solid var(--dp-line)', paddingTop: 10 }}>
            <p style={{ fontSize: 14 }}>
              <span aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span>{' '}
              <span className="dp-mut">
                {names[r.reviewer_id] ?? 'Student'} · {new Date(r.created_at).toLocaleDateString()}
              </span>
            </p>
            {r.comment && <p style={{ fontSize: 14, marginTop: 4 }}>{r.comment}</p>}
          </li>
        ))}
      </ul>

      {canReview && (
        <form onSubmit={submit} style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <p style={{ fontSize: 14 }}>The seller confirmed you bought this. How was the deal?</p>
          <div role="radiogroup" aria-label="Rating" style={{ fontSize: 24 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)}
                style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--dp-fg)' }}
              >
                {n <= rating ? '★' : '☆'}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="Comment (optional)"
          />
          {err && <p style={{ color: 'crimson', fontSize: 14 }}>{err}</p>}
          <button className="dp-btn" disabled={busy} type="submit">
            {busy ? 'Posting…' : 'Post review'}
          </button>
        </form>
      )}

      {!canReview && !isSeller && !alreadyReviewed && (
        <p className="dp-mut" style={{ fontSize: 14, marginTop: 12 }}>
          Only the buyer the seller confirms can review this listing.
        </p>
      )}
    </section>
  );
}