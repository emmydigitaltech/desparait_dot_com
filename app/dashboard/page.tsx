import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCompletion, MIN_TO_SELL } from '@/lib/completion'
import { connection } from "next/server";
import Avatar from '@/components/Avatar'
import AvatarUploader from '@/components/AvatarUploader'
import MarkSoldButton from '@/components/MarkSoldButton'

async function Dashboard() {
  await connection();
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: req }, { data: myListings, error: listingsError }] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, avatar_url, phone, campus, role, is_verified')
      .eq('id', user.id).single(),
    supabase.from('verification_requests')
      .select('status, note').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('listings')
      .select('id, title, price, status, image_url, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (listingsError) console.error('Dashboard listings error:', listingsError)

  const { pct, missing, canSell } = getCompletion(profile)

  const category =
    profile?.role === 'admin' ? 'Admin'
    : profile?.is_verified ? 'Verified seller'
    : req?.status === 'pending' ? 'Seller (pending review)'
    : 'Buyer'

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center gap-4">
        <Avatar url={profile?.avatar_url} name={profile?.full_name} size={56} />
        <div>
          <h1 className="text-xl font-semibold">{profile?.full_name ?? user.email}</h1>
          <span className="dp-pill">{category}</span>
        </div>
      </header>

      <section className="dp-panel">
        <div className="mb-2 flex justify-between text-sm font-medium">
          <span>Profile completion</span><span>{pct}%</span>
        </div>
        <div className="dp-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        {missing.length > 0 && (
          <ul className="dp-mut mt-3 list-disc pl-5 text-sm">
            {missing.map((m) => (
              <li key={m.key}>{m.label} (+{m.points}%)</li>
            ))}
          </ul>
        )}
        <p className="dp-mut mt-3 text-xs">
          You need more than {MIN_TO_SELL}% to list products.
        </p>
        <div className="mt-4">
          <AvatarUploader
            userId={user.id}
            url={profile?.avatar_url}
            name={profile?.full_name}
          />
        </div>
        <Link href="/dashboard/profile" className="dp-link mt-3 inline-block text-sm">
          Edit profile
        </Link>
      </section>

      <section className="dp-panel">
        {profile?.role === 'admin' ? (
          <Link href="/admin" className="dp-link">Go to admin panel</Link>
        ) : profile?.is_verified ? (
          canSell ? (
            <Link href="/listings/new" className="dp-link">Create a listing</Link>
          ) : (
            <p className="dp-sell-error text-sm">
              You&apos;re verified, but your profile must be above {MIN_TO_SELL}% before you can list. Finish the items above.
            </p>
          )
        ) : req?.status === 'pending' ? (
          <p className="text-sm">Your seller verification is under review.</p>
        ) : (
          <>
            {req?.status === 'rejected' && (
              <p className="dp-sell-error mb-2">Rejected: {req.note}</p>
            )}
            <p className="mb-2 text-sm">Want to sell on campus? Verification adds 50% to your profile.</p>
            <Link href="/verify" className="dp-btn">
              {req?.status === 'rejected' ? 'Resubmit verification' : 'Become a verified seller'}
            </Link>
          </>
        )}
      </section>

      <section className="dp-panel">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">My listings</h2>
          <Link href="/listings/new" className="dp-link text-sm">New listing</Link>
        </div>
        {!myListings?.length ? (
          <p className="dp-mut text-sm">You haven&apos;t posted anything yet.</p>
        ) : (
          <ul className="space-y-2">
            {myListings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/listings/${l.id}`} className="dp-lrow min-w-0 flex-1">
                  {l.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="dp-mut text-xs">₦{Number(l.price).toLocaleString()} · {l.status}</p>
                  </div>
                </Link>
                <Link href={`/listings/${l.id}/edit`} className="dp-link shrink-0 text-sm">
                  Edit
                </Link>
                {l.status === 'active' && <MarkSoldButton listingId={l.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default function Page() {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><Dashboard /></Suspense>
}