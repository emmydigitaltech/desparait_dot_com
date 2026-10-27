import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const STEPS = [
  { key: 'full_name', label: 'Add your full name' },
  { key: 'avatar_url', label: 'Add a profile photo' },
  { key: 'phone', label: 'Add your phone number' },
  { key: 'campus', label: 'Select your campus' },
] as const

async function Dashboard() {
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

  const done = STEPS.filter((s) => profile?.[s.key])
  const pct = Math.round((done.length / STEPS.length) * 100)
  const missing = STEPS.filter((s) => !profile?.[s.key])

  const category =
    profile?.role === 'admin' ? 'Admin'
    : profile?.is_verified ? 'Verified seller'
    : req?.status === 'pending' ? 'Seller (pending review)'
    : 'Buyer'

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center gap-4">
        {profile?.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
        )}
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
            {missing.map((m) => <li key={m.key}>{m.label}</li>)}
          </ul>
        )}
        <Link href="/dashboard/profile" className="dp-link mt-3 inline-block text-sm">
          Edit profile
        </Link>
      </section>

      <section className="dp-panel">
        {profile?.role === 'admin' ? (
          <Link href="/admin" className="dp-link">Go to admin panel</Link>
        ) : profile?.is_verified ? (
          <Link href="/listings/new" className="dp-link">Create a listing</Link>
        ) : req?.status === 'pending' ? (
          <p className="text-sm">Your seller verification is under review.</p>
        ) : (
          <>
            {req?.status === 'rejected' && (
              <p className="dp-sell-error mb-2">Rejected: {req.note}</p>
            )}
            <p className="mb-2 text-sm">Want to sell on campus?</p>
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
              <li key={l.id}>
                <Link href={`/listings/${l.id}`} className="dp-lrow">
                  {l.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="dp-mut text-xs">₦{Number(l.price).toLocaleString()} · {l.status}</p>
                  </div>
                </Link>
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