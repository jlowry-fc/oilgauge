import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { fractLabel } from '@/lib/calc'

export default async function LeaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lease } = await supabase
    .from('leases')
    .select('id, name, state, notes, tanks(id, name, capacity_bbls, bbls_per_inch, is_primary)')
    .eq('id', params.id)
    .single()

  if (!lease) notFound()

  const { data: readings } = await supabase
    .from('gauge_readings')
    .select('*, users(full_name)')
    .eq('lease_id', params.id)
    .order('reading_date', { ascending: false })
    .limit(30)

  const tank = (lease.tanks as any[])?.find(t => t.is_primary) ?? (lease.tanks as any[])?.[0]
  const lastReading = readings?.[0]
  const pct = tank && lastReading ? Math.round((lastReading.bbls_on_hand / tank.capacity_bbls) * 100) : 0

  const typeLabel: Record<string, string> = {
    normal:'Normal', oil_sold:'Oil Sold', transferred:'Transferred',
    bottom_pulled:'Bottom Pulled', correction:'Correction', other:'Other'
  }
  const typeBadge: Record<string, string> = {
    normal:'badge-green', oil_sold:'badge-blue', transferred:'badge-blue',
    bottom_pulled:'badge-amber', correction:'badge-amber', other:'badge-amber'
  }

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">← Back</Link>
        <div style={{ flex:1 }}>
          <h1 className="serif" style={{ fontSize:'28px' }}>{lease.name}</h1>
          <p style={{ color:'var(--text2)', fontSize:'13px' }}>
            {tank?.name} · {tank?.capacity_bbls} BBL · {tank?.bbls_per_inch} BBL/in
            {lease.state ? ` · ${lease.state}` : ''}
          </p>
        </div>
        <Link href="/gauge" className="btn btn-primary">+ Gauge</Link>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'20px' }}>
        {[
          ['BBLs On Hand', lastReading ? `${lastReading.bbls_on_hand}` : '—', 'var(--accent)'],
          ['Tank Level', lastReading ? `${lastReading.feet}′ ${lastReading.inches}″` : '—', 'var(--text)'],
          ['BBL/Day Avg', lastReading?.bbls_per_day?.toFixed(2) ?? '—', 'var(--green)'],
          ['Tank Full %', lastReading ? `${pct}%` : '—', 'var(--text)'],
        ].map(([label, val, color]) => (
          <div key={label} className="card">
            <div style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'6px' }}>{label}</div>
            <div className="mono" style={{ fontSize:'22px', color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tank fill bar */}
      {lastReading && (
        <div className="card" style={{ marginBottom:'16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--text2)', marginBottom:'8px' }}>
            <span>Tank level</span><span>{pct}% full · {lastReading.bbls_on_hand} / {tank?.capacity_bbls} BBLs</span>
          </div>
          <div className="tank-bar" style={{ height:'10px' }}>
            <div className="tank-fill" style={{ width:`${Math.min(100,pct)}%` }} />
          </div>
        </div>
      )}

      {/* Reading history */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px' }}>
          <span style={{ fontSize:'13px', fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Reading History</span>
          <span style={{ fontSize:'12px', color:'var(--text3)' }}>{readings?.length ?? 0} readings</span>
        </div>

        {(!readings || readings.length === 0) && (
          <p style={{ color:'var(--text3)', fontSize:'13px' }}>No readings yet. <Link href="/gauge" style={{ color:'var(--accent)' }}>Submit the first gauge.</Link></p>
        )}

        <div style={{ overflowX:'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th><th>Pumper</th><th>Ft</th><th>In</th><th>Frac</th>
                <th>BBLs</th><th>Δ BBLs</th><th>Days</th><th>BBL/Day</th><th>Type</th>
              </tr>
            </thead>
            <tbody>
              {readings?.map(r => {
                const isAdj = r.reading_type !== 'normal'
                return (
                  <tr key={r.id} className={isAdj ? 'adj' : ''}>
                    <td style={{ color:'var(--text)', fontWeight:500, whiteSpace:'nowrap' }}>
                      {new Date(r.reading_date).toLocaleDateString()}
                    </td>
                    <td>{r.users?.full_name ?? '—'}</td>
                    <td className="mono">{r.feet}</td>
                    <td className="mono">{r.inches}</td>
                    <td className="mono">{fractLabel(r.inch_fraction)}</td>
                    <td className="mono" style={{ color:'var(--text)', fontWeight:500 }}>{r.bbls_on_hand}</td>
                    <td className="mono">
                      {r.bbls_since_last == null ? <span style={{ color:'var(--text3)' }}>—</span> :
                        <span style={{ color: r.bbls_since_last < 0 ? 'var(--red)' : 'var(--green)' }}>
                          {r.bbls_since_last > 0 ? '+' : ''}{r.bbls_since_last}
                        </span>}
                    </td>
                    <td className="mono">{r.days_since_last?.toFixed(1) ?? '—'}</td>
                    <td className="mono">{r.bbls_per_day?.toFixed(2) ?? '—'}</td>
                    <td><span className={`badge ${typeBadge[r.reading_type] ?? 'badge-amber'}`}>{typeLabel[r.reading_type] ?? r.reading_type}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
