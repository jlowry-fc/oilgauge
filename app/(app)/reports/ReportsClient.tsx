'use client'
import { useState } from 'react'
import { fractLabel } from '@/lib/calc'

export default function ReportsClient({ leases, readings }: { leases: any[]; readings: any[] }) {
  const [filterLease, setFilterLease] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = readings.filter(r => {
    if (filterLease !== 'all' && r.lease_id !== filterLease) return false
    if (filterType !== 'all' && r.reading_type !== filterType) return false
    if (dateFrom && new Date(r.reading_date) < new Date(dateFrom)) return false
    if (dateTo && new Date(r.reading_date) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  function exportCSV() {
    const headers = ['Date','Lease','Tank','Pumper','Feet','Inches','Fraction','BBLs On Hand','Δ BBLs','Days Since Last','BBL/Day','Type','Ticket #','Purchaser','BBLs Sold','Comments']
    const rows = filtered.map(r => [
      new Date(r.reading_date).toLocaleString(),
      r.leases?.name ?? '',
      r.tanks?.name ?? '',
      r.users?.full_name ?? '',
      r.feet, r.inches, fractLabel(r.inch_fraction),
      r.bbls_on_hand,
      r.bbls_since_last ?? '',
      r.days_since_last ?? '',
      r.bbls_per_day ?? '',
      r.reading_type,
      r.ticket_number ?? '',
      r.purchaser_name ?? '',
      r.bbls_sold ?? '',
      r.comments ?? '',
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `OilGauge_export_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const totalBbls = filtered.filter(r=>r.reading_type==='normal').reduce((s,r)=>s+(r.bbls_since_last??0),0)
  const totalSold = filtered.filter(r=>r.reading_type==='oil_sold').reduce((s,r)=>s+(r.bbls_sold??0),0)

  return (
    <div>
      <h1 className="serif" style={{ fontSize:'26px', marginBottom:'4px' }}>Reports & Export</h1>
      <p style={{ color:'var(--text2)', fontSize:'13px', marginBottom:'20px' }}>Filter and export your gauge data</p>

      {/* Filters */}
      <div className="card" style={{ marginBottom:'16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'12px' }}>
          <div>
            <label className="form-label">Lease</label>
            <select className="form-input" value={filterLease} onChange={e=>setFilterLease(e.target.value)}>
              <option value="all">All Leases</option>
              {leases.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Reading Type</label>
            <select className="form-input" value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="normal">Normal Gauge</option>
              <option value="oil_sold">Oil Sold</option>
              <option value="transferred">Transferred</option>
              <option value="bottom_pulled">Bottom Pulled</option>
              <option value="correction">Correction</option>
            </select>
          </div>
          <div>
            <label className="form-label">Date From</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Date To</label>
            <input type="date" className="form-input" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'16px' }}>
        {[
          ['Readings', filtered.length],
          ['Production BBLs', totalBbls.toFixed(2)],
          ['BBLs Sold', totalSold.toFixed(2)],
          ['Oil Sales', filtered.filter(r=>r.reading_type==='oil_sold').length],
        ].map(([label, val]) => (
          <div key={label} className="card">
            <div style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'6px' }}>{label}</div>
            <div className="mono" style={{ fontSize:'20px', color:'var(--accent)' }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
        <button className="btn btn-primary" onClick={exportCSV}>Export {filtered.length} rows to CSV</button>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="tbl">
            <thead>
              <tr><th>Date</th><th>Lease</th><th>Pumper</th><th>Ft</th><th>In</th><th>BBLs</th><th>Δ BBLs</th><th>BBL/Day</th><th>Type</th></tr>
            </thead>
            <tbody>
              {filtered.slice(0,100).map(r => (
                <tr key={r.id} className={r.reading_type!=='normal'?'adj':''}>
                  <td style={{ whiteSpace:'nowrap', color:'var(--text)' }}>{new Date(r.reading_date).toLocaleDateString()}</td>
                  <td style={{ fontWeight:500, color:'var(--text)' }}>{r.leases?.name}</td>
                  <td>{r.users?.full_name ?? '—'}</td>
                  <td className="mono">{r.feet}</td>
                  <td className="mono">{r.inches}</td>
                  <td className="mono">{r.bbls_on_hand}</td>
                  <td className="mono">
                    {r.bbls_since_last == null ? '—' :
                      <span style={{ color: r.bbls_since_last < 0 ? 'var(--red)' : 'var(--green)' }}>
                        {r.bbls_since_last > 0 ? '+' : ''}{r.bbls_since_last}
                      </span>}
                  </td>
                  <td className="mono">{r.bbls_per_day?.toFixed(2) ?? '—'}</td>
                  <td><span className={`badge ${r.reading_type==='normal'?'badge-green':r.reading_type==='oil_sold'?'badge-blue':'badge-amber'}`}>{r.reading_type.replace('_',' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 100 && <p style={{ color:'var(--text3)', fontSize:'12px', padding:'10px 12px' }}>Showing 100 of {filtered.length} rows. Export CSV for full data.</p>}
        </div>
      </div>
    </div>
  )
}
