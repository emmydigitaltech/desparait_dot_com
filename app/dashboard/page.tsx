import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { connection } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCompletion, MIN_TO_SELL } from '@/lib/completion'
import AvatarUploader from '@/components/AvatarUploader'
import MarkSoldButton from '@/components/MarkSoldButton'
import Splash from '@/components/Splash'

const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`

const STATUS: Record<string, string> = {
  active: 'Live',
  sold: 'Sold out',
  pending: 'In review',
  rejected: 'Rejected',
}

async function Dashboard() {
  await connection()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fdashboard')

  const [
    { data: profile },
    { data: req },
    { data: myListings, error: listingsError },
    { data: pts },
    { data: stats },
    { count: bankCount },
  ] = await Promise.all([
    supabase.from('profiles')
      .select('full_name, avatar_url, phone, campus, role, is_verified')
      .eq('id', user.id).single(),
    supabase.from('verification_requests')
      .select('status, note').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('listings')
      .select('id, title, price, status, image_url, stock')
      .eq('seller_id', user.id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.rpc('get_my_points'),
    supabase.rpc('get_seller_analytics'),
    supabase.from('seller_bank_details').select('*', { count: 'exact', head: true }),
  ])

  if (listingsError) console.error('Dashboard listings error:', listingsError)

  const { pct, missing, canSell } = getCompletion(profile)
  const pp = (pts ?? null) as { available?: number; pending?: number } | null
  const isAdmin = profile?.role === 'admin'
  const isSeller = isAdmin || !!profile?.is_verified

  const category =
    isAdmin ? 'Admin'
    : profile?.is_verified ? 'Verified seller'
    : req?.status === 'pending' ? 'Seller (pending review)'
    : 'Buyer'

  const name = profile?.full_name ?? user.email ?? 'there'
  const month = stats?.periods?.month ?? { revenue: 0, orders: 0 }
  const today = stats?.periods?.today ?? { revenue: 0, orders: 0 }
  const daily: { day: string; revenue: number }[] = stats?.daily ?? []
  const maxRev = Math.max(...daily.map((d) => Number(d.revenue)), 1)

  return (
    <main className="fv-wrap">
      {/* LEFT */}
      <aside className="fv-side">
        <div className="fv-card fv-profile">
          <AvatarUploader userId={user.id} url={profile?.avatar_url} name={profile?.full_name} />
          <h1 className="fv-name">{name}</h1>
          <span className={`fv-pill ${profile?.is_verified ? 'fv-pill-green' : ''}`}>
            {profile?.is_verified ? '✓ ' : ''}{category}
          </span>

          <div className="fv-progress-head">
            <span>Profile completion</span>
            <strong>{pct}%</strong>
          </div>
          <div className="fv-bar"><div style={{ width: `${pct}%` }} /></div>

          {missing.length > 0 && (
            <ul className="fv-missing">
              {missing.map((m) => (
                <li key={m.key}>{m.label} (+{m.points}%)</li>
              ))}
            </ul>
          )}
          <p className="fv-mut fv-sm">You need more than {MIN_TO_SELL}% to list products.</p>

          <Link href="/dashboard/profile" className="fv-btn-o fv-full">Edit profile</Link>
        </div>

        <div className="fv-card">
          <h2 className="fv-h">Points</h2>
          <p className="fv-big">{Number(pp?.available ?? 0)}</p>
          <p className="fv-mut">
            available{Number(pp?.pending ?? 0) > 0 ? ` · ${Number(pp?.pending)} pending` : ''}
          </p>
          <Link href="/points" className="fv-btn-o fv-full" style={{ marginTop: 12 }}>
            View &amp; redeem
          </Link>
        </div>
      </aside>

      {/* RIGHT */}
      <section className="fv-main">
        <div className="fv-top">
          <div>
            <h2 className="fv-title">Welcome back, {name.split(' ')[0]} 👋</h2>
            <p className="fv-mut">Here is how your shop is doing.</p>
          </div>
          {isAdmin ? (
            <Link href="/admin" className="fv-btn">Go to admin panel</Link>
          ) : isSeller && canSell ? (
            <Link href="/listings/new" className="fv-btn">+ Create a listing</Link>
          ) : null}
        </div>

        {/* Verification / blockers */}
        {!isSeller && req?.status === 'pending' && (
          <div className="fv-alert">Your seller verification is under review.</div>
        )}
        {!isSeller && req?.status !== 'pending' && (
          <div className="fv-cta">
            <div>
              <h3 className="fv-h">Want to sell on campus?</h3>
              {req?.status === 'rejected' && (
                <p className="fv-err">Rejected: {req.note}</p>
              )}
              <p className="fv-mut">Verification adds 50% to your profile.</p>
            </div>
            <Link href="/verify" className="fv-btn">
              {req?.status === 'rejected' ? 'Resubmit verification' : 'Become a verified seller'}
            </Link>
          </div>
        )}
        {profile?.is_verified && !isAdmin && !canSell && (
          <div className="fv-alert">
            You&apos;re verified, but your profile must be above {MIN_TO_SELL}% before you can list.
            Finish the items on the left.
          </div>
        )}
        {isSeller && canSell && !bankCount && (
          <div className="fv-alert">
            <span>Add your payout account so buyers can pay you.</span>
            <Link href="/settings/bank" className="fv-btn fv-btn-sm">Add account</Link>
          </div>
        )}

        {isSeller && (
          <>
            <div className="fv-stats">
              <div className="fv-card">
                <p className="fv-mut">Earned this month</p>
                <p className="fv-big">{naira(month.revenue)}</p>
                <p className="fv-mut fv-sm">{naira(today.revenue)} today</p>
              </div>
              <div className="fv-card">
                <p className="fv-mut">Completed orders</p>
                <p className="fv-big">{month.orders}</p>
                <p className="fv-mut fv-sm">this month</p>
              </div>
              <div className="fv-card">
                <p className="fv-mut">Active orders</p>
                <p className="fv-big">{stats?.open ?? 0}</p>
                <Link href="/orders" className="fv-link fv-sm">View orders</Link>
              </div>
              <div className="fv-card">
                <p className="fv-mut">Live listings</p>
                <p className="fv-big">{stats?.live ?? 0}</p>
                <p className="fv-mut fv-sm">{stats?.low_stock ?? 0} low on stock</p>
              </div>
            </div>

            <div className="fv-card">
              <div className="fv-row">
                <h2 className="fv-h">Earnings, last 30 days</h2>
                <Link href="/dashboard/sales" className="fv-btn-o fv-btn-sm">Full analytics</Link>
              </div>
              <div className="fv-spark" aria-hidden>
                {daily.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${naira(d.revenue)}`}
                    style={{ height: `${Math.max(3, (Number(d.revenue) / maxRev) * 100)}%` }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="fv-card">
          <div className="fv-row">
            <h2 className="fv-h">My listings</h2>
            <Link href="/listings" className="fv-link">Manage all</Link>
          </div>
          {!myListings?.length ? (
            <p className="fv-mut">You haven&apos;t posted anything yet.</p>
          ) : (
            <ul className="fv-list">
              {myListings.map((l) => (
                <li key={l.id}>
                  {l.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.image_url} alt="" className="fv-thumb" />
                  ) : (
                    <span className="fv-thumb" />
                  )}
                  <div className="fv-grow">
                    <Link href={`/listings/${l.id}`} className="fv-ltitle">{l.title}</Link>
                    <p className="fv-mut fv-sm">{naira(l.price)} · {l.stock} in stock</p>
                  </div>
                  <span className={`fv-pill fv-st-${l.status}`}>{STATUS[l.status] ?? l.status}</span>
                  <Link href={`/listings/${l.id}/edit`} className="fv-btn-o fv-btn-sm">Edit</Link>
                  {l.status === 'active' && <MarkSoldButton listingId={l.id} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<Splash />}>
      <Dashboard />
    </Suspense>
  )
}