'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewLeasePage() {
  const router = useRouter()
  const supabase = createClient()
  const [leaseName, setLeaseName] = useState('')
  const [state, setState] = useState('')
  const [notes, setNotes] = useState('')
  const [tankName, setTankName] = useState('Tank 1')
  const [capacity, setCapacity] = useState('')
  const [bblsPerInch, setBblsPerInch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!leaseName || !capacity || !bblsPerInch) { setError('Lease name, tank capacity, and BBL/inch are required.'); return }
    setSaving(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user!.id).single()

    const { data: lease, error: leaseErr } = await supabase.from('leases').insert({
      tenant_id: profile!.tenant_id,
      name: leaseName,
      state: state || null,
      notes: notes || null,
      is_active: true,
    }).select().single()

    if (leaseErr) { setError(leaseErr.message); setSaving(false); return }

    const { error: tankErr } = await supabase.from('tanks').insert({
      lease_id: lease.id,
      tenant_id: profile!.tenant_id,
      name: tankName,
      capacity_bbls: parseFloat(capacity),
      bbls_per_inch: parseFloat(bblsPerInch),
      is_active: true,
      is_primary: true,
    })

    if (tankErr) { setError(tankErr.message); setSaving(false); return }
    router.push(`/leases/${lease.id}`)
  }

  return (
    <div style={{ maxWidth:'520px', margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
        <h1 className="serif" style={{ fontSize:'24px' }}>Add New Lease</h1>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom:'16px' }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'16px' }}>Lease Info</div>
          <div style={{ marginBottom:'14px' }}>
            <label className="form-label">Lease / Well Name *</label>
            <input type="text" className="form-input" value={leaseName} onChange={e=>setLeaseName(e.target.value)} placeholder="e.g. Schuster" required />
          </div>
          <div style={{ marginBottom:'14px' }}>
            <label className="form-label">State</label>
            <input type="text" className="form-input" value={state} onChange={e=>setState(e.target.value)} placeholder="KS, OK, TX…" maxLength={2} style={{ textTransform:'uppercase' }} />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Optional…" style={{ resize:'vertical' }} />
          </div>
        </div>

        <div className="card" style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'16px' }}>Tank Info</div>
          <div style={{ marginBottom:'14px' }}>
            <label className="form-label">Tank Name</label>
            <input type="text" className="form-input" value={tankName} onChange={e=>setTankName(e.target.value)} placeholder="Tank 1" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <label className="form-label">Capacity (BBLs) *</label>
              <input type="number" className="form-input" value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="202" step="0.01" required />
            </div>
            <div>
              <label className="form-label">BBL per Inch *</label>
              <input type="number" className="form-input" value={bblsPerInch} onChange={e=>setBblsPerInch(e.target.value)} placeholder="1.67" step="0.0001" required />
            </div>
          </div>
          <div style={{ marginTop:'10px', fontSize:'12px', color:'var(--text3)' }}>
            At {bblsPerInch || '1.67'} BBL/in, a full {capacity || '202'} BBL tank is {capacity && bblsPerInch ? Math.round(parseFloat(capacity)/parseFloat(bblsPerInch)) : '—'} inches tall.
          </div>
        </div>

        {error && <div style={{ background:'rgba(232,85,85,0.1)', border:'1px solid rgba(232,85,85,0.3)', borderRadius:'8px', padding:'10px 14px', color:'var(--red)', fontSize:'13px', marginBottom:'16px' }}>{error}</div>}

        <button type="submit" className="btn btn-primary" style={{ width:'100%', padding:'14px', fontSize:'16px', justifyContent:'center' }} disabled={saving}>
          {saving ? 'Saving…' : 'Create Lease & Tank'}
        </button>
      </form>
    </div>
  )
}
