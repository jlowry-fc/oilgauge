import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LeasesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()

  const { data: leases } = await supabase
    .from('leases')
    .select('id, name, is_active, tanks(id, name, capacity_bbls, bbls_per_inch)')
    .eq('tenant_id', profile!.tenant_id)
    .order('name')

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <h1 className="serif" style={{ fontSize:'26px' }}>Leases & Tanks</h1>
        <Link href="/leases/new" className="btn btn-primary">+ Add Lease</Link>
      </div>

      {(!leases || leases.length === 0) && (
        <div className="card" style={{ textAlign:'center', padding:'40px' }}>
          <p style={{ color:'var(--text2)', marginBottom:'16px' }}>No leases yet.</p>
          <Link href="/leases/new" className="btn btn-primary">Add First Lease</Link>
        </div>
      )}

      <div style={{ display:'grid', gap:'10px' }}>
        {leases?.map(l => (
          <Link key={l.id} href={`/leases/${l.id}`} style={{ textDecoration:'none' }}>
            <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
              <div>
                <div style={{ fontSize:'18px', fontWeight:600, color:'var(--text)' }}>{l.name}</div>
                <div style={{ fontSize:'13px', color:'var(--text2)', marginTop:'3px' }}>
                  {(l.tanks as any[])?.map((t: any) => `${t.name}: ${t.capacity_bbls} BBL · ${t.bbls_per_inch} BBL/in`).join(' · ')}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span className={`badge ${l.is_active ? 'badge-green' : 'badge-red'}`}>
                  {l.is_active ? 'Active' : 'Inactive'}
                </span>
                <span style={{ color:'var(--text3)' }}>›</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
