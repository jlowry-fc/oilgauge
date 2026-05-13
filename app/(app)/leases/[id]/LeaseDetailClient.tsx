'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { fractLabel, FRACTIONS } from '@/lib/calc'

const WELL_STATUS_COLORS: Record<string, string> = {
  active: 'var(--green)',
  inactive: 'var(--text3)',
  shut_in: 'var(--accent)',
  plugged: 'var(--red)',
}

const typeLabel: Record<string, string> = {
  normal: 'Normal', oil_sold: 'Oil Sold', transferred: 'Transferred',
  bottom_pulled: 'Bottom Pulled', correction: 'Correction', other: 'Other',
}
const typeBadge: Record<string, string> = {
  normal: 'badge-green', oil_sold: 'badge-blue', transferred: 'badge-blue',
  bottom_pulled: 'badge-amber', correction: 'badge-amber', other: 'badge-amber',
}

export default function LeaseDetailClient({ lease, tank, allTanks, wells, readings, lastReading, pct }: {
  lease: any; tank: any; allTanks: any[]; wells: any[]
  readings: any[]; lastReading: any; pct: number
}) {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'readings' | 'tanks' | 'wells'>('readings')
  const [editingTank, setEditingTank] = useState<any>(null)
  const [tankName, setTankName] = useState('')
  const [tankCapacity, setTankCapacity] = useState('')
  const [tankBblsPerInch, setTankBblsPerInch] = useState('')
  const [tankIsPrimary, setTankIsPrimary] = useState(false)
  const [savingTank, setSavingTank] = useState(false)
  const [showAddTank, setShowAddTank] = useState(false)
  const [tankError, setTankError] = useState('')
  const [updatingWell, setUpdatingWell] = useState<string | null>(null)

  function startEditTank(t: any) {
    setEditingTank(t)
    setTankName(t.name)
    setTankCapacity(String(t.capacity_bbls))
    setTankBblsPerInch(String(t.bbls_per_inch))
    setTankIsPrimary(t.is_primary)
    setShowAddTank(false)
    setTankError('')
  }

  function startAddTank() {
    setEditingTank(null)
    setTankName('Tank ' + (allTanks.length + 1))
    setTankCapacity('')
    setTankBblsPerInch('')
    setTankIsPrimary(false)
    setShowAddTank(true)
    setTankError('')
  }

  async function saveTank() {
    if (!tankName || !tankCapacity || !tankBblsPerInch) {
      setTankError('All fields required.'); return
    }
    setSavingTank(true); setTankError('')
    const payload = {
      name: tankName,
      capacity_bbls: parseFloat(tankCapacity),
      bbls_per_inch: parseFloat(tankBblsPerInch),
      is_primary: tankIsPrimary,
    }
    if (editingTank) {
      // If setting as primary, unset others first
      if (tankIsPrimary) {
        await supabase.from('tanks').update({ is_primary: false }).eq('lease_id', lease.id)
      }
      await supabase.from('tanks').update(payload).eq('id', editingTank.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user!.id).single()
      if (tankIsPrimary) {
        await supabase.from('tanks').update({ is_primary: false }).eq('lease_id', lease.id)
      }
      await supabase.from('tanks').insert({
        ...payload,
        lease_id: lease.id,
        tenant_id: profile!.tenant_id,
        is_active: true,
      })
    }
    setSavingTank(false)
    setEditingTank(null)
    setShowAddTank(false)
    router.refresh()
  }

  async function updateWellStatus(wellId: string, status: string) {
    setUpdatingWell(wellId)
    await supabase.from('wells').update({ status }).eq('id', wellId)
    setUpdatingWell(null)
    router.refresh()
  }

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => setTab(t)} style={{
      padding: '8px 16px', fontSize: '13px', fontWeight: 500,
      color: tab === t ? 'var(--accent)' : 'var(--text2)',
      borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
      background: 'none', border: 'none', borderBottomStyle: 'solid',
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">← Back</Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="serif" style={{ fontSize: '28px' }}>{lease.name}</h1>
            {lease.lease_number && (
              <span className="badge badge-blue">#{lease.lease_number}</span>
            )}
          </div>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '2px' }}>
            {(lease.lease_groups as any)?.name && (
              <span style={{ color: 'var(--accent)', marginRight: '8px' }}>
                ⬡ {(lease.lease_groups as any).name}
              </span>
            )}
            {tank?.name} · {tank?.capacity_bbls} BBL · {tank?.bbls_per_inch} BBL/in
            {lease.state ? ` · ${lease.state}` : ''}
          </p>
        </div>
        <Link href="/gauge" className="btn btn-primary">+ Gauge</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          ['BBLs On Hand', lastReading ? `${lastReading.bbls_on_hand}` : '—', 'var(--accent)'],
          ['Tank Level', lastReading ? `${lastReading.feet}′ ${lastReading.inches}″` : '—', 'var(--text)'],
          ['BBL/Day Avg', lastReading?.bbls_per_day?.toFixed(2) ?? '—', 'var(--green)'],
          ['Tank Full', lastReading ? `${pct}%` : '—', 'var(--text)'],
        ].map(([label, val, color]) => (
          <div key={label} className="card">
            <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>{label}</div>
            <div className="mono" style={{ fontSize: '22px', color: color as string }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tank fill bar */}
      {lastReading && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>
            <span>Tank level</span>
            <span>{pct}% · {lastReading.bbls_on_hand} / {tank?.capacity_bbls} BBLs</span>
          </div>
          <div className="tank-bar" style={{ height: '10px' }}>
            <div className="tank-fill" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
      )}

      {/* Wells summary (always visible if wells exist) */}
      {wells && wells.length > 0 && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px' }}>
            Wells on this Lease
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {wells.map((w: any) => (
              <div key={w.id} style={{
                padding: '6px 12px', borderRadius: '8px',
                border: `1.5px solid ${WELL_STATUS_COLORS[w.status] ?? 'var(--border2)'}`,
                background: `${WELL_STATUS_COLORS[w.status] ?? 'var(--border2)'}18`,
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{w.name}</div>
                <div style={{ fontSize: '11px', color: WELL_STATUS_COLORS[w.status], textTransform: 'capitalize' }}>
                  {w.status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
        {tabBtn('readings', `Readings (${readings.length})`)}
        {tabBtn('tanks', `Tanks (${allTanks.length})`)}
        {wells.length > 0 && tabBtn('wells', `Wells (${wells.length})`)}
      </div>

      {/* READINGS TAB */}
      {tab === 'readings' && (
        <div className="card">
          {readings.length === 0 && (
            <p style={{ color: 'var(--text3)', fontSize: '13px' }}>
              No readings yet. <Link href="/gauge" style={{ color: 'var(--accent)' }}>Submit the first gauge.</Link>
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th><th>Pumper</th><th>Ft</th><th>In</th><th>Frac</th>
                  <th>BBLs</th><th>Δ BBLs</th><th>Days</th><th>BBL/Day</th><th>Type</th>
                </tr>
              </thead>
              <tbody>
                {readings.map(r => (
                  <tr key={r.id} className={r.reading_type !== 'normal' ? 'adj' : ''}>
                    <td style={{ color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {new Date(r.reading_date).toLocaleDateString()}
                    </td>
                    <td>{r.users?.full_name ?? '—'}</td>
                    <td className="mono">{r.feet}</td>
                    <td className="mono">{r.inches}</td>
                    <td className="mono">{fractLabel(r.inch_fraction)}</td>
                    <td className="mono" style={{ color: 'var(--text)', fontWeight: 500 }}>{r.bbls_on_hand}</td>
                    <td className="mono">
                      {r.bbls_since_last == null
                        ? <span style={{ color: 'var(--text3)' }}>—</span>
                        : <span style={{ color: r.bbls_since_last < 0 ? 'var(--red)' : 'var(--green)' }}>
                            {r.bbls_since_last > 0 ? '+' : ''}{r.bbls_since_last}
                          </span>}
                    </td>
                    <td className="mono">{r.days_since_last?.toFixed(1) ?? '—'}</td>
                    <td className="mono">{r.bbls_per_day?.toFixed(2) ?? '—'}</td>
                    <td>
                      <span className={`badge ${typeBadge[r.reading_type] ?? 'badge-amber'}`}>
                        {typeLabel[r.reading_type] ?? r.reading_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TANKS TAB */}
      {tab === 'tanks' && (
        <div>
          <div style={{ display: 'grid', gap: '10px', marginBottom: '14px' }}>
            {allTanks.map((t: any) => (
              <div key={t.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingTank?.id === t.id ? '16px' : 0 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                      {t.is_primary && <span className="badge badge-green">Primary</span>}
                      {!t.is_active && <span className="badge badge-red">Inactive</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '3px' }}>
                      {t.capacity_bbls} BBL capacity · {t.bbls_per_inch} BBL/in
                    </div>
                  </div>
                  {editingTank?.id !== t.id && (
                    <button className="btn btn-ghost btn-sm" onClick={() => startEditTank(t)}>Edit</button>
                  )}
                </div>

                {editingTank?.id === t.id && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label className="form-label">Tank Name</label>
                        <input type="text" className="form-input" value={tankName} onChange={e => setTankName(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                        <input type="checkbox" id="primary-check" checked={tankIsPrimary}
                          onChange={e => setTankIsPrimary(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                        <label htmlFor="primary-check" style={{ fontSize: '13px', color: 'var(--text2)', cursor: 'pointer' }}>
                          Set as primary (receiving production)
                        </label>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label className="form-label">Capacity (BBLs)</label>
                        <input type="number" className="form-input" value={tankCapacity}
                          onChange={e => setTankCapacity(e.target.value)} step="0.01" />
                      </div>
                      <div>
                        <label className="form-label">BBL per Inch</label>
                        <input type="number" className="form-input" value={tankBblsPerInch}
                          onChange={e => setTankBblsPerInch(e.target.value)} step="0.0001" />
                      </div>
                    </div>
                    {tankError && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '10px' }}>{tankError}</div>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={saveTank} disabled={savingTank}>
                        {savingTank ? 'Saving…' : 'Save Tank'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingTank(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add tank */}
          {!showAddTank ? (
            <button className="btn btn-ghost btn-sm" onClick={startAddTank}>+ Add Another Tank</button>
          ) : (
            <div className="card">
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', marginBottom: '14px' }}>New Tank</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label className="form-label">Tank Name</label>
                  <input type="text" className="form-input" value={tankName} onChange={e => setTankName(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                  <input type="checkbox" id="new-primary" checked={tankIsPrimary}
                    onChange={e => setTankIsPrimary(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
                  <label htmlFor="new-primary" style={{ fontSize: '13px', color: 'var(--text2)', cursor: 'pointer' }}>
                    Set as primary
                  </label>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label">Capacity (BBLs)</label>
                  <input type="number" className="form-input" value={tankCapacity}
                    onChange={e => setTankCapacity(e.target.value)} placeholder="202" step="0.01" />
                </div>
                <div>
                  <label className="form-label">BBL per Inch</label>
                  <input type="number" className="form-input" value={tankBblsPerInch}
                    onChange={e => setTankBblsPerInch(e.target.value)} placeholder="1.67" step="0.0001" />
                </div>
              </div>
              {tankError && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '10px' }}>{tankError}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary btn-sm" onClick={saveTank} disabled={savingTank}>
                  {savingTank ? 'Saving…' : 'Add Tank'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddTank(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WELLS TAB */}
      {tab === 'wells' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {wells.length === 0 && (
            <div className="card" style={{ color: 'var(--text3)', fontSize: '13px' }}>
              No wells added yet. Edit this lease to add wells.
            </div>
          )}
          {wells.map((w: any) => (
            <div key={w.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>{w.name}</div>
                  {w.api_number && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>API: {w.api_number}</div>}
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  background: `${WELL_STATUS_COLORS[w.status]}20`,
                  color: WELL_STATUS_COLORS[w.status],
                  textTransform: 'capitalize',
                }}>
                  {w.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['active', 'inactive', 'shut_in', 'plugged'].map(s => (
                  <button key={s} type="button"
                    onClick={() => updateWellStatus(w.id, s)}
                    disabled={updatingWell === w.id || w.status === s}
                    style={{
                      padding: '5px 10px', fontSize: '12px', borderRadius: '6px',
                      border: `1.5px solid ${w.status === s ? WELL_STATUS_COLORS[s] : 'var(--border2)'}`,
                      background: w.status === s ? `${WELL_STATUS_COLORS[s]}20` : 'transparent',
                      color: w.status === s ? WELL_STATUS_COLORS[s] : 'var(--text3)',
                      cursor: w.status === s ? 'default' : 'pointer',
                      fontFamily: 'inherit', opacity: updatingWell === w.id ? 0.5 : 1,
                    }}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
