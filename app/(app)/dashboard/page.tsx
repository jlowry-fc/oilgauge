import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { fractLabel } from '@/lib/calc'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('tenant_id, full_name').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // Fetch leases with their tanks and most recent reading
  const { data: leases } = await supabase
    .from('leases')
    .select(`
      id, name, is_active,
      tanks ( id, name, capacity_bbls, bbls_per_inch, is_primary ),
      gauge_readings (
        id, feet, inches, inch_fraction, bbls_on_hand,
        reading_date, reading_type, bbls_per_day,
        users ( full_name )
      )
    `)
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('reading_date', { referencedTable: 'gauge_readings', ascending: false })

  const now = new Date()

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'10px' }}>
        <div>
          <h1 className="serif" style={{ fontSize:'26px' }}>Production Overview</h1>
          <p style={{ color:'var(--text2)', fontSize:'13px', marginTop:'2px' }}>
            {leases?.length ?? 0} active leases
          </p>
        </div>
        <Link href="/gauge" className="btn btn-primary">+ Submit Gauge</Link>
      </div>

      {(!leases || leases.length === 0) && (
        <div className="card" style={{ textAlign:'center', padding:'40px' }}>
          <p style={{ color:'var(--text2)', marginBottom:'16px' }}>No leases yet. Add your first lease to get started.</p>
          <Link href="/leases/new" className="btn btn-primary">Add First Lease</Link>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:'14px' }}>
        {leases?.map(lease => {
          const tank = lease.tanks?.find((t: any) => t.is_primary) ?? lease.tanks?.[0]
          const lastReading = (lease.gauge_readings as any[])?.[0]
          const daysAgo = lastReading
            ? Math.round(Math.abs(now.getTime() - new Date(lastReading.reading_date).getTime()) / 86400000)
            : null
          const pct = tank && lastReading ? Math.round((lastReading.bbls_on_hand / tank.capacity_bbls) * 100) : 0
          const isOverdue = daysAgo !== null && daysAgo > 7
          const pumperName = lastReading?.users?.full_name ?? '—'

          return (
            <Link key={lease.id} href={`/leases/${lease.id}`} style={{ textDecoration:'none' }}>
              <div className="card" style={{ cursor:'pointer', transition:'all .2s', borderColor: isOverdue ? 'rgba(232,85,85,0.3)' : undefined }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'8px' }}>
                  <h2 className="serif" style={{ fontSize:'22px' }}>{lease.name}</h2>
                  {isOverdue
                    ? <span className="badge badge-red">Overdue</span>
                    : <span className="badge badge-green">Active</span>}
                </div>

                {lastReading ? (
                  <>
                    <div className="mono" style={{ fontSize:'28px', color:'var(--accent)' }}>
                      {lastReading.bbls_on_hand} <span style={{ fontSize:'14px', color:'var(--text2)', fontFamily:'DM Sans' }}>BBLs</span>
                    </div>
                    <div className="tank-bar" style={{ marginTop:'10px' }}>
                      <div className="tank-fill" style={{ width:`${Math.min(100, pct)}%` }} />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'4px', marginTop:'12px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                        <span style={{ color:'var(--text3)' }}>Level</span>
                        <span className="mono" style={{ color:'var(--text2)' }}>
                          {lastReading.feet} ft {lastReading.inches} in {fractLabel(lastReading.inch_fraction)}
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                        <span style={{ color:'var(--text3)' }}>Last gauged</span>
                        <span style={{ color: isOverdue ? 'var(--red)' : 'var(--text2)' }}>
                          {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`} · {pumperName}
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                        <span style={{ color:'var(--text3)' }}>BBL/day avg</span>
                        <span className="mono" style={{ color:'var(--green)' }}>
                          {lastReading.bbls_per_day?.toFixed(2) ?? '—'}
                        </span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                        <span style={{ color:'var(--text3)' }}>Tank</span>
                        <span className="mono" style={{ color:'var(--text2)' }}>
                          {tank?.capacity_bbls ?? '—'} BBL cap · {pct}% full
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color:'var(--text3)', fontSize:'13px', marginTop:'12px' }}>No readings yet</div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      <div style={{ marginTop:'20px', display:'flex', gap:'10px', flexWrap:'wrap' }}>
        <Link href="/leases/new" className="btn btn-ghost btn-sm">+ Add Lease</Link>
      </div>
    </div>
  )
}
