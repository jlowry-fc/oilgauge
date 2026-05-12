import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GaugeForm from './GaugeForm'

export default async function GaugePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('tenant_id, full_name, role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  // For pumpers: only assigned leases. For owners: all leases.
  let leasesQuery = supabase
    .from('leases')
    .select(`id, name, tanks ( id, name, capacity_bbls, bbls_per_inch, is_primary )`)
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('name')

  const { data: leases } = await leasesQuery

  return (
    <GaugeForm
      leases={leases ?? []}
      pumperName={profile.full_name}
      userId={user.id}
    />
  )
}
