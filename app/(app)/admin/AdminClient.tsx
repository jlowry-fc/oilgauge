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

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'badge-amber', owner: 'badge-blue', pumper: 'badge-green'
}

export default function AdminClient({ currentUserId, operators, tenants }: {
  currentUserId: string; operators: Operator[]; tenants: Tenant[]
}) {
  const [tab, setTab] = useState<'companies' | 'users' | 'invite' | 'new-company'>('companies')
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Selected user for management drawer
  const [selectedUser, setSelectedUser] = useState<Operator | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editTenantId, setEditTenantId] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [tempPassword, setTempPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  function openUserDrawer(op: Operator) {
    setSelectedUser(op)
    setEditName(op.full_name)
    setEditRole(op.role)
    setEditTenantId(op.tenant_id)
    setEditActive(op.is_active)
    setTempPassword('')
    setShowPassword(false)
    setConfirmDelete(false)
    setMsg(null)
  }

  function closeDrawer() {
    setSelectedUser(null)
    setConfirmDelete(false)
    setTempPassword('')
  }

  async function callApi(body: any) {
    const res = await fetch('/api/admin/manage-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  async function saveProfile() {
    if (!selectedUser) return
    setSaving(true); setMsg(null)
    const data = await callApi({
      action: 'update_profile',
      user_id: selectedUser.id,
      full_name: editName,
      role: editRole,
      tenant_id: editTenantId,
      is_active: editActive,
    })
    setSaving(false)
    if (data.ok) {
      setMsg({ ok: true, text: 'Profile updated.' })
      setTimeout(() => window.location.reload(), 800)
    } else {
      setMsg({ ok: false, text: data.error })
    }
  }

  async function setPassword() {
    if (!selectedUser || !tempPassword) return
    if (tempPassword.length < 8) { setMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return }
    setSaving(true); setMsg(null)
    const data = await callApi({
      action: 'set_password',
      user_id: selectedUser.id,
      password: tempPassword,
    })
    setSaving(false)
    if (data.ok) {
      setMsg({ ok: true, text: 'Password set. User must change it on next login.' })
      setTempPassword('')
    } else {
      setMsg({ ok: false, text: data.error })
    }
  }

  async function deleteUser() {
    if (!selectedUser) return
    setSaving(true); setMsg(null)
    const data = await callApi({ action: 'delete_user', user_id: selectedUser.id })
    setSaving(false)
    if (data.ok) {
      closeDrawer()
      window.location.reload()
    } else {
      setMsg({ ok: false, text: data.error })
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteTenantId) { setMsg({ ok: false, text: 'Select a company.' }); return }
    setInviting(true); setMsg(null)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, full_name: inviteName, tenant_id: inviteTenantId, role: inviteRole }),
    })
    const data = await res.json()
    setInviting(false)
    if (res.ok) {
      setMsg({ ok: true, text: `Invite sent to ${inviteEmail}` })
      setInviteEmail(''); setInviteName(''); setInviteTenantId('')
    } else {
      setMsg({ ok: false, text: data.error ?? 'Failed.' })
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
      setMsg({ ok: false, text: data.error ?? 'Failed.' })
    }
  }

  const filtered = operators.filter(op =>
    op.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (op.tenants?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

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

      {/* Summary stats */}
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
        {tabBtn('users', 'Users')}
        {tabBtn('new-company', '+ New Company')}
        {tabBtn('invite', '+ Invite User')}
      </div>

      {/* Global message */}
      {msg && !selectedUser && (
        <div style={{
          background: msg.ok ? 'rgba(63,182,138,0.1)' : 'rgba(232,85,85,0.1)',
          border: `1px solid ${msg.ok ? 'rgba(63,182,138,0.3)' : 'rgba(232,85,85,0.3)'}`,
          borderRadius: '8px', padding: '10px 14px',
          color: msg.ok ? 'var(--green)' : 'var(--red)',
          fontSize: '13px', marginBottom: '16px',
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
                        <div style={{ fontSize: '12px' }}>
                          {companyUsers.map(u => (
                            <span key={u.id} style={{ marginRight: '8px' }}>
                              <button onClick={() => { setTab('users'); openUserDrawer(u) }}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', padding: 0 }}>
                                {u.full_name}
                              </button>
                              <span style={{ color: 'var(--text3)', marginLeft: '3px' }}>({u.role})</span>
                            </span>
                          ))}
                          {companyUsers.length === 0 && <span style={{ color: 'var(--text3)' }}>No users</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedUser ? '1fr 360px' : '1fr', gap: '16px', alignItems: 'start' }}>
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
                    <tr><th>Name</th><th>Company</th><th>Role</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: '24px' }}>No users found</td></tr>
                    )}
                    {filtered.map(op => (
                      <tr key={op.id} style={{ cursor: 'pointer' }} onClick={() => openUserDrawer(op)}>
                        <td style={{ color: 'var(--text)', fontWeight: 500 }}>
                          {op.full_name}
                          {op.id === currentUserId && (
                            <span className="badge badge-blue" style={{ marginLeft: '8px', fontSize: '10px' }}>you</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text2)' }}>{op.tenants?.name ?? '—'}</td>
                        <td><span className={`badge ${ROLE_COLORS[op.role] ?? 'badge-blue'}`}>{op.role}</span></td>
                        <td><span className={`badge ${op.is_active ? 'badge-green' : 'badge-red'}`}>{op.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td style={{ color: 'var(--text3)', fontSize: '18px' }}>›</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* USER MANAGEMENT DRAWER */}
          {selectedUser && (
            <div className="card" style={{ position: 'sticky', top: '80px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{selectedUser.full_name}</div>
                <button onClick={closeDrawer} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
              </div>

              {msg && (
                <div style={{
                  background: msg.ok ? 'rgba(63,182,138,0.1)' : 'rgba(232,85,85,0.1)',
                  border: `1px solid ${msg.ok ? 'rgba(63,182,138,0.3)' : 'rgba(232,85,85,0.3)'}`,
                  borderRadius: '8px', padding: '8px 12px',
                  color: msg.ok ? 'var(--green)' : 'var(--red)',
                  fontSize: '12px', marginBottom: '14px',
                }}>{msg.text}</div>
              )}

              {/* Profile fields */}
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={editName}
                  onChange={e => setEditName(e.target.value)} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Company</label>
                <select className="form-input" value={editTenantId}
                  onChange={e => setEditTenantId(e.target.value)}>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {['owner', 'pumper'].map(r => (
                    <button key={r} type="button"
                      className={`reason-btn ${editRole === r ? 'active' : ''}`}
                      style={{ padding: '8px', fontSize: '12px' }}
                      onClick={() => setEditRole(r)}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {[['active', true], ['inactive', false]].map(([label, val]) => (
                    <button key={String(label)} type="button"
                      className={`reason-btn ${editActive === val ? 'active' : ''}`}
                      style={{ padding: '8px', fontSize: '12px' }}
                      onClick={() => setEditActive(val as boolean)}>
                      {String(label).charAt(0).toUpperCase() + String(label).slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {selectedUser.id !== currentUserId && (
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '16px' }}
                  onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              )}

              {/* Password section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '16px' }}>
                <label className="form-label">Set Temporary Password</label>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '8px' }}>
                  User will be required to change this on next login.
                </div>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={tempPassword}
                    onChange={e => setTempPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    style={{ paddingRight: '44px' }}
                  />
                  <button type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '13px' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={setPassword} disabled={saving || !tempPassword}>
                  {saving ? 'Setting…' : 'Set Password'}
                </button>
              </div>

              {/* Danger zone */}
              {selectedUser.id !== currentUserId && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '8px' }}>Danger Zone</div>
                  {!confirmDelete ? (
                    <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => setConfirmDelete(true)}>
                      Delete User
                    </button>
                  ) : (
                    <div style={{ background: 'rgba(232,85,85,0.08)', border: '1px solid rgba(232,85,85,0.3)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '10px' }}>
                        This permanently deletes the user and cannot be undone.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                        <button className="btn btn-danger btn-sm" onClick={deleteUser} disabled={saving}>
                          {saving ? '…' : 'Yes, Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NEW COMPANY TAB */}
      {tab === 'new-company' && (
        <div style={{ maxWidth: '480px' }}>
          <div className="card">
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '20px', lineHeight: '1.6' }}>
              Creates a new isolated company account and sends the owner an invitation email.
            </div>
            <form onSubmit={createCompany}>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Company / Operation Name *</label>
                <input type="text" className="form-input" value={companyName}
                  onChange={e => setCompanyName(e.target.value)} placeholder="Smith Oil Properties" required />
              </div>
              <div style={{ height: '1px', background: 'var(--border)', margin: '16px 0' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Owner Account</div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Owner Full Name *</label>
                <input type="text" className="form-input" value={ownerName}
                  onChange={e => setOwnerName(e.target.value)} placeholder="Jane Smith" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Owner Email *</label>
                <input type="email" className="form-input" value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)} placeholder="jane@smithoil.com" required />
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
                  onChange={e => setInviteName(e.target.value)} placeholder="Mike Thurston" required />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)} placeholder="mike@example.com" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button" className={`reason-btn ${inviteRole === 'owner' ? 'active' : ''}`}
                    onClick={() => setInviteRole('owner')}>Operator / Owner</button>
                  <button type="button" className={`reason-btn ${inviteRole === 'pumper' ? 'active' : ''}`}
                    onClick={() => setInviteRole('pumper')}>Pumper</button>
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
