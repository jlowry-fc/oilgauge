'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Operator = {
  id: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  tenant_id: string
  tenants: { name: string } | null
}

type Tenant = {
  id: string
  name: string
  created_at: string
  leases: { id: string }[]
  gauge_readings: { id: string }[]
}

export default function AdminClient({
  currentUserId,
  operators,
  tenants,
}: {
  currentUserId: string
  operators: Operator[]
  tenants: Tenant[]
}) {
  const supabase = createClient()

  const [tab, setTab] = useState<'operators' | 'invite'>('operators')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteCompany, setInviteCompany] = useState('')
  const [inviteRole, setInviteRole] = useState<'owner' | 'pumper'>('owner')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const filtered = operators.filter(op =>
    op.full_name.toLowerCase().includes(search.toLowerCase()) ||
    op.tenants?.name.toLowerCase().includes(search.toLowerCase())
  )

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteResult(null)

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        full_name: inviteName,
        company_name: inviteCompany,
        role: inviteRole,
      }),
    })
    const data = await res.json()
    setInviting(false)
    if (res.ok) {
      setInviteResult({ ok: true, msg: `Invite sent to ${inviteEmail}. They'll receive an email to set their password.` })
      setInviteEmail(''); setInviteName(''); setInviteCompany('')
    } else {
      setInviteResult({ ok: false, msg: data.error ?? 'Failed to send invite.' })
    }
  }

  async function toggleActive(op: Operator) {
    setTogglingId(op.id)
    await supabase.from('users').update({ is_active: !op.is_active }).eq('id', op.id)
    setTogglingId(null)
    window.location.reload()
  }

  const tabStyle = (t: string) => ({
    padding: '8px 16px', fontSize: '13px', fontWeight: 500 as const,
    color: tab === t ? 'var(--accent)' : 'var(--text2)',
    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
    cursor: 'pointer', background: 'none', border: 'none',
    borderBottomStyle: 'solid' as const, fontFamily: 'inherit',
  })

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="serif" style={{ fontSize: '26px', marginBottom: '4px' }}>Admin</h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          Manage operators and send invitations — {operators.length} operators across {tenants.length} accounts
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          ['Total Operators', operators.length],
          ['Active', operators.filter(o => o.is_active).length],
          ['Total Accounts', tenants.length],
          ['Total Gauges', tenants.reduce((s, t) => s + t.gauge_readings.length, 0)],
        ].map(([label, val]) => (
          <div key={label} className="card">
            <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>{label}</div>
            <div className="mono" style={{ fontSize: '22px', color: 'var(--accent)' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button style={tabStyle('operators')} onClick={() => setTab('operators')}>Operators</button>
        <button style={tabStyle('invite')} onClick={() => setTab('invite')}>+ Send Invitation</button>
      </div>

      {tab === 'operators' && (
        <div>
          <div style={{ marginBottom: '14px' }}>
            <input
              type="search" className="form-input" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or company…"
              style={{ maxWidth: '360px' }}
            />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company / Tenant</th>
                    <th>Role</th>
                    <th>Leases</th>
                    <th>Gauges</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>No operators found</td></tr>
                  )}
                  {filtered.map(op => {
                    const tenant = tenants.find(t => t.id === op.tenant_id)
                    return (
                      <tr key={op.id}>
                        <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                          {op.full_name}
                          {op.id === currentUserId && (
                            <span className="badge badge-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>you</span>
                          )}
                        </td>
                        <td>{op.tenants?.name ?? '—'}</td>
                        <td><span className={`badge ${op.role === 'super_admin' ? 'badge-amber' : 'badge-blue'}`}>{op.role}</span></td>
                        <td className="mono">{tenant?.leases.length ?? 0}</td>
                        <td className="mono">{tenant?.gauge_readings.length ?? 0}</td>
                        <td style={{ whiteSpace: 'nowrap', color: 'var(--text3)' }}>
                          {new Date(op.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span className={`badge ${op.is_active ? 'badge-green' : 'badge-red'}`}>
                            {op.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {op.id !== currentUserId && (
                            <button
                              className={`btn btn-sm ${op.is_active ? 'btn-danger' : 'btn-ghost'}`}
                              onClick={() => toggleActive(op)}
                              disabled={togglingId === op.id}
                            >
                              {togglingId === op.id ? '…' : op.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'invite' && (
        <div style={{ maxWidth: '480px' }}>
          <div className="card">
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px', lineHeight: '1.6' }}>
              The person will receive an email with a link to set their password. They'll be added as an operator with their own isolated account and data.
            </div>

            <form onSubmit={sendInvite}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Jane Smith" required />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="jane@example.com" required />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Company / Operation Name *</label>
                <input type="text" className="form-input" value={inviteCompany}
                  onChange={e => setInviteCompany(e.target.value)}
                  placeholder="Smith Oil Properties" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button"
                    className={`reason-btn ${inviteRole === 'owner' ? 'active' : ''}`}
                    onClick={() => setInviteRole('owner')}>
                    Operator / Owner
                  </button>
                  <button type="button"
                    className={`reason-btn ${inviteRole === 'pumper' ? 'active' : ''}`}
                    onClick={() => setInviteRole('pumper')}>
                    Pumper
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px' }}>
                  Operators get their own account with full access. Pumpers are added under an existing operator's account.
                </div>
              </div>

              {inviteResult && (
                <div style={{
                  background: inviteResult.ok ? 'rgba(63,182,138,0.1)' : 'rgba(232,85,85,0.1)',
                  border: `1px solid ${inviteResult.ok ? 'rgba(63,182,138,0.3)' : 'rgba(232,85,85,0.3)'}`,
                  borderRadius: '8px', padding: '10px 14px',
                  color: inviteResult.ok ? 'var(--green)' : 'var(--red)',
                  fontSize: '13px', marginBottom: '16px'
                }}>
                  {inviteResult.msg}
                </div>
              )}

              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '16px', justifyContent: 'center' }}
                disabled={inviting}>
                {inviting ? 'Sending invite…' : 'Send Invitation Email'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
