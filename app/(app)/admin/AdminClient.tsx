'use client'
import { useState } from 'react'

type Operator = {
  id: string; full_name: string; role: string; is_active: boolean
  created_at: string; tenant_id: string; tenants: { name: string } | null
}
type Tenant = {
  id: string; name: string; created_at: string
  leases: { id: string }[]; gauge_readings: { id: string }[]
}

export default function AdminClient({ currentUserId, operators, tenants }: {
  currentUserId: string; operators: Operator[]; tenants: Tenant[]
}) {
  const [tab, setTab] = useState<'companies' | 'operators' | 'invite' | 'new-company'>('companies')
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteTenantId, setInviteTenantId] = useState('')
  const [inviteRole, setInviteRole] = useState<'owner' | 'pumper'>('owner')
  const [inviting, setInviting] = useState(false)

  // New company form
  const [companyName, setCompanyName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [creatingCompany, setCreatingCompany] = useState(false)

  const filtered = operators.filter(op =>
    op.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (op.tenants?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteTenantId) { setMsg({ ok: false, text: 'Select a company first.' }); return }
    setInviting(true); setMsg(null)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail, full_name: inviteName,
        tenant_id: inviteTenantId, role: inviteRole,
      }),
    })
    const data = await res.json()
    setInviting(false)
    if (res.ok) {
      setMsg({ ok: true, text: `Invite sent to ${inviteEmail}` })
      setInviteEmail(''); setInviteName(''); setInviteTenantId('')
    } else {
      setMsg({ ok: false, text: data.error ?? 'Failed to send invite.' })
    }
  }

  async function createCompany(e: React.FormEvent) {
    e.preventDefault()
    setCreatingCompany(true); setMsg(null)
    const res = await fetch('/api/admin/create-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName, owner_email: ownerEmail, owner_name: ownerName }),
    })
    const data = await res.json()
    setCreatingCompany(false)
    if (res.ok) {
      setMsg({ ok: true, text: `Company "${companyName}" created. Invite sent to ${ownerEmail}.` })
      setCompanyName(''); setOwnerEmail(''); setOwnerName('')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      setMsg({ ok: false, text: data.error ?? 'Failed to create company.' })
    }
  }

  async function toggleActive(op: Operator) {
    setTogglingId(op.id)
    await fetch('/api/admin/toggle-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: op.id, is_active: !op.is_active }),
    })
    setTogglingId(null)
    window.location.reload()
  }

  const tabBtn = (t: typeof tab, label: string) => (
    <button onClick={() => { setTab(t); setMsg(null) }} style={{
      padding: '8px 16px', fontSize: '13px', fontWeight: 500,
      color: tab === t ? 'var(--accent)' : 'var(--text2)',
      borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
      background: 'none', border: 'none', borderBottomStyle: 'solid',
      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    }}>{label}</button>
  )

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="serif" style={{ fontSize: '26px', marginBottom: '4px' }}>Admin</h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          {tenants.length} companies · {operators.length} users
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          ['Companies', tenants.length],
          ['Active Users', operators.filter(o => o.is_active).length],
          ['Owners', operators.filter(o => o.role === 'owner').length],
          ['Pumpers', operators.filter(o => o.role === 'pumper').length],
          ['Total Gauges', tenants.reduce((s, t) => s + t.gauge_readings.length, 0)],
        ].map(([label, val]) => (
          <div key={label} className="card">
            <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>{label}</div>
            <div className="mono" style={{ fontSize: '22px', color: 'var(--accent)' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto' }}>
        {tabBtn('companies', 'Companies')}
        {tabBtn('operators', 'Users')}
        {tabBtn('new-company', '+ New Company')}
        {tabBtn('invite', '+ Invite User')}
      </div>

      {/* Alert */}
      {msg && (
        <div style={{
          background: msg.ok ? 'rgba(63,182,138,0.1)' : 'rgba(232,85,85,0.1)',
          border: `1px solid ${msg.ok ? 'rgba(63,182,138,0.3)' : 'rgba(232,85,85,0.3)'}`,
          borderRadius: '8px', padding: '10px 14px',
          color: msg.ok ? 'var(--green)' : 'var(--red)',
          fontSize: '13px', marginBottom: '16px'
        }}>{msg.text}</div>
      )}

      {/* COMPANIES TAB */}
      {tab === 'companies' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Company</th><th>Leases</th><th>Gauges</th><th>Users</th><th>Created</th></tr>
              </thead>
              <tbody>
                {tenants.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>No companies yet</td></tr>
                )}
                {tenants.map(t => {
                  const companyUsers = operators.filter(o => o.tenant_id === t.id)
                  return (
                    <tr key={t.id}>
                      <td style={{ color: 'var(--text)', fontWeight: 600 }}>{t.name}</td>
                      <td className="mono">{t.leases.length}</td>
                      <td className="mono">{t.gauge_readings.length}</td>
                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                          {companyUsers.map(u => (
                            <span key={u.id} style={{ marginRight: '8px' }}>
                              {u.full_name}
                              <span style={{ color: 'var(--text3)', marginLeft: '3px' }}>({u.role})</span>
                            </span>
                          ))}
                          {companyUsers.length === 0 && <span style={{ color: 'var(--text3)' }}>No users yet</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'operators' && (
        <div>
          <div style={{ marginBottom: '14px' }}>
            <input type="search" className="form-input" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or company…"
              style={{ maxWidth: '360px' }} />
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th>Name</th><th>Company</th><th>Role</th><th>Joined</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>No users found</td></tr>
                  )}
                  {filtered.map(op => (
                    <tr key={op.id}>
                      <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                        {op.full_name}
                        {op.id === currentUserId && (
                          <span className="badge badge-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>you</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text2)' }}>{op.tenants?.name ?? '—'}</td>
                      <td><span className={`badge ${op.role === 'super_admin' ? 'badge-amber' : op.role === 'owner' ? 'badge-blue' : 'badge-green'}`}>{op.role}</span></td>
                      <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{new Date(op.created_at).toLocaleDateString()}</td>
                      <td><span className={`badge ${op.is_active ? 'badge-green' : 'badge-red'}`}>{op.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        {op.id !== currentUserId && (
                          <button className={`btn btn-sm ${op.is_active ? 'btn-danger' : 'btn-ghost'}`}
                            onClick={() => toggleActive(op)} disabled={togglingId === op.id}>
                            {togglingId === op.id ? '…' : op.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NEW COMPANY TAB */}
      {tab === 'new-company' && (
        <div style={{ maxWidth: '480px' }}>
          <div className="card">
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px', lineHeight: '1.6' }}>
              Creates a new isolated company account and sends the owner an invitation email to set their password.
            </div>
            <form onSubmit={createCompany}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Company / Operation Name *</label>
                <input type="text" className="form-input" value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Smith Oil Properties" required />
              </div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                Owner Account
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Owner Full Name *</label>
                <input type="text" className="form-input" value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="Jane Smith" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Owner Email *</label>
                <input type="email" className="form-input" value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  placeholder="jane@smithoil.com" required />
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '16px', justifyContent: 'center' }}
                disabled={creatingCompany}>
                {creatingCompany ? 'Creating…' : 'Create Company & Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* INVITE USER TAB */}
      {tab === 'invite' && (
        <div style={{ maxWidth: '480px' }}>
          <div className="card">
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px', lineHeight: '1.6' }}>
              Invite an additional owner or pumper to an existing company.
            </div>
            <form onSubmit={sendInvite}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Company *</label>
                <select className="form-input" value={inviteTenantId}
                  onChange={e => setInviteTenantId(e.target.value)} required>
                  <option value="">Select a company…</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Mike Thurston" required />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="mike@example.com" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button" className={`reason-btn ${inviteRole === 'owner' ? 'active' : ''}`} onClick={() => setInviteRole('owner')}>Operator / Owner</button>
                  <button type="button" className={`reason-btn ${inviteRole === 'pumper' ? 'active' : ''}`} onClick={() => setInviteRole('pumper')}>Pumper</button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '16px', justifyContent: 'center' }}
                disabled={inviting}>
                {inviting ? 'Sending…' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
