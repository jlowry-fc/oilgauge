'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const WELL_STATUSES = [
  { value: 'active', label: 'Active', color: 'var(--green)' },
  { value: 'inactive', label: 'Inactive', color: 'var(--text3)' },
  { value: 'shut_in', label: 'Shut In', color: 'var(--accent)' },
  { value: 'plugged', label: 'Plugged', color: 'var(--red)' },
]

export default function NewLeasePage() {
  const router = useRouter()
  const supabase = createClient()

  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [leaseName, setLeaseName] = useState('')
  const [leaseNumber, setLeaseNumber] = useState('')
  const [state, setState] = useState('')
  const [notes, setNotes] = useState('')
  const [groupId, setGroupId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [tankName, setTankName] = useState('Tank 1')
  const [capacity, setCapacity] = useState('')
  const [bblsPerInch, setBblsPerInch] = useState('')
  const [wells, setWells] = useState([{ name: '', api_number: '', status: 'active' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('lease_groups').select('id, name').order('name')
      .then(({ data }) => setGroups(data ?? []))
  }, [])

  function addWell() {
    setWells([...wells, { name: '', api_number: '', status: 'active' }])
  }
  function removeWell(i: number) {
    setWells(wells.filter((_, idx) => idx !== i))
  }
  function updateWell(i: number, field: string, value: string) {
    setWells(wells.map((w, idx) => idx === i ? { ...w, [field]: value } : w))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!leaseName || !capacity || !bblsPerInch) {
      setError('Lease name, capacity, and BBL/inch are required.')
      return
    }
    setSaving(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user!.id).single()
    const tenantId = profile!.tenant_id

    // Create new group if specified
    let finalGroupId = groupId || null
    if (newGroupName && !groupId) {
      const { data: newGroup, error: groupErr } = await supabase
        .from('lease_groups')
        .insert({ tenant_id: tenantId, name: newGroupName })
        .select().single()
      if (groupErr) { setError(groupErr.message); setSaving(false); return }
      finalGroupId = newGroup.id
    }

    // Create lease
    const { data: lease, error: leaseErr } = await supabase.from('leases').insert({
      tenant_id: tenantId,
      name: leaseName,
      lease_number: leaseNumber || null,
      state: state || null,
      notes: notes || null,
      group_id: finalGroupId,
      is_active: true,
    }).select().single()

    if (leaseErr) { setError(leaseErr.message); setSaving(false); return }

    // Create tank
    const { error: tankErr } = await supabase.from('tanks').insert({
      lease_id: lease.id, tenant_id: tenantId,
      name: tankName, capacity_bbls: parseFloat(capacity),
      bbls_per_inch: parseFloat(bblsPerInch),
      is_active: true, is_primary: true,
    })
    if (tankErr) { setError(tankErr.message); setSaving(false); return }

    // Create wells
    const validWells = wells.filter(w => w.name.trim())
    if (validWells.length > 0) {
      const { error: wellErr } = await supabase.from('wells').insert(
        validWells.map(w => ({
          lease_id: lease.id, tenant_id: tenantId,
          name: w.name, api_number: w.api_number || null, status: w.status,
        }))
      )
      if (wellErr) { setError(wellErr.message); setSaving(false); return }
    }

    router.push(`/leases/${lease.id}`)
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
        <h1 className="serif" style={{ fontSize: '24px' }}>Add New Lease</h1>
      </div>

      <form onSubmit={handleSave}>
        {/* Lease Group */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
            Lease Group (optional)
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label className="form-label">Add to existing group</label>
            <select className="form-input" value={groupId} onChange={e => { setGroupId(e.target.value); if (e.target.value) setNewGroupName('') }}>
              <option value="">— None / create new —</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {!groupId && (
            <div>
              <label className="form-label">Or create new group</label>
              <input type="text" className="form-input" value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g. Schuster" />
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
                Other leases can be added to this group later
              </div>
            </div>
          )}
        </div>

        {/* Lease Info */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>Lease Info</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label className="form-label">Lease Name *</label>
              <input type="text" className="form-input" value={leaseName}
                onChange={e => setLeaseName(e.target.value)} placeholder="e.g. Schuster" required />
            </div>
            <div style={{ width: '80px' }}>
              <label className="form-label"># / ID</label>
              <input type="text" className="form-input" value={leaseNumber}
                onChange={e => setLeaseNumber(e.target.value)} placeholder="2" />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">State</label>
            <input type="text" className="form-input" value={state}
              onChange={e => setState(e.target.value.toUpperCase())}
              placeholder="KS" maxLength={2} />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Tank */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>Tank Info</div>
          <div style={{ marginBottom: '14px' }}>
            <label className="form-label">Tank Name</label>
            <input type="text" className="form-input" value={tankName} onChange={e => setTankName(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label">Capacity (BBLs) *</label>
              <input type="number" className="form-input" value={capacity}
                onChange={e => setCapacity(e.target.value)} placeholder="202" step="0.01" required />
            </div>
            <div>
              <label className="form-label">BBL per Inch *</label>
              <input type="number" className="form-input" value={bblsPerInch}
                onChange={e => setBblsPerInch(e.target.value)} placeholder="1.67" step="0.0001" required />
            </div>
          </div>
        </div>

        {/* Wells */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Wells</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addWell}>+ Add Well</button>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>
            Add individual wellbores with their status. Leave blank if tracking lease as a whole.
          </div>
          {wells.map((w, i) => (
            <div key={i} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>Well Name</div>
                  <input type="text" className="form-input" value={w.name}
                    onChange={e => updateWell(i, 'name', e.target.value)}
                    placeholder="Schuster 2" style={{ fontSize: '14px', padding: '9px 12px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>API Number</div>
                  <input type="text" className="form-input" value={w.api_number}
                    onChange={e => updateWell(i, 'api_number', e.target.value)}
                    placeholder="Optional" style={{ fontSize: '14px', padding: '9px 12px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {WELL_STATUSES.map(s => (
                    <button key={s.value} type="button"
                      onClick={() => updateWell(i, 'status', s.value)}
                      style={{
                        padding: '5px 10px', fontSize: '12px', borderRadius: '6px',
                        border: `1.5px solid ${w.status === s.value ? s.color : 'var(--border2)'}`,
                        background: w.status === s.value ? `${s.color}20` : 'transparent',
                        color: w.status === s.value ? s.color : 'var(--text3)',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {wells.length > 1 && (
                  <button type="button" onClick={() => removeWell(i)}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(232,85,85,0.1)', border: '1px solid rgba(232,85,85,0.3)', borderRadius: '8px', padding: '10px 14px', color: 'var(--red)', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '16px', justifyContent: 'center' }}
          disabled={saving}>
          {saving ? 'Saving…' : 'Create Lease'}
        </button>
      </form>
    </div>
  )
}
