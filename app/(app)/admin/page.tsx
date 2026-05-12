import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') redirect('/dashboard')

  const { data: operatorsRaw } = await supabase
    .from('users')
    .select('id, full_name, role, is_active, created_at, tenant_id, tenants(name)')
    .in('role', ['owner', 'pumper'])
    .order('created_at', { ascending: false })

  const operators = (operatorsRaw ?? []).map((op: any) => ({
    ...op,
    tenants: Array.isArray(op.tenants) ? (op.tenants[0] ?? null) : op.tenants,
  }))

  const { data: tenants } = await supabase
    .from('tenants')
    .select(`id, name, created_at, leases(id), gauge_readings(id)`)
    .order('name')

  return (
    <AdminClient
      currentUserId={user.id}
      operators={operators}
      tenants={tenants ?? []}
    />
  )
}
