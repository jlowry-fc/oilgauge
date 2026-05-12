import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only super_admins can access this page
  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // Fetch all operators (owners) across all tenants
  const { data: operators } = await supabase
    .from('users')
    .select('id, full_name, role, is_active, created_at, tenant_id, tenants(name)')
    .eq('role', 'owner')
    .order('created_at', { ascending: false })

  // Fetch all tenants with lease/reading counts
  const { data: tenants } = await supabase
    .from('tenants')
    .select(`
      id, name, created_at,
      leases(id),
      gauge_readings(id)
    `)
    .order('created_at', { ascending: false })

  return (
    <AdminClient
      currentUserId={user.id}
      operators={operators ?? []}
      tenants={tenants ?? []}
    />
  )
}
