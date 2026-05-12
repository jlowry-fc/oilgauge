import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single()

  const { data: leases } = await supabase
    .from('leases')
    .select('id, name')
    .eq('tenant_id', profile!.tenant_id)
    .eq('is_active', true)
    .order('name')

  const { data: readings } = await supabase
    .from('gauge_readings')
    .select('*, leases(name), tanks(name), users(full_name)')
    .eq('tenant_id', profile!.tenant_id)
    .order('reading_date', { ascending: false })

  return <ReportsClient leases={leases ?? []} readings={readings ?? []} />
}
