import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { fractLabel } from '@/lib/calc'
import LeaseDetailClient from './LeaseDetailClient'

export default async function LeaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lease } = await supabase
    .from('leases')
    .select(`
      id, name, state, notes, is_active, lease_number, group_id,
      tanks ( id, name, capacity_bbls, bbls_per_inch, is_primary, is_active ),
      wells ( id, name, api_number, status ),
      lease_groups ( id, name )
    `)
    .eq('id', params.id)
    .single()

  if (!lease) notFound()

  const { data: readings } = await supabase
    .from('gauge_readings')
    .select('*, users(full_name)')
    .eq('lease_id', params.id)
    .order('reading_date', { ascending: false })
    .limit(30)

  const tank = (lease.tanks as any[])?.find((t: any) => t.is_primary) ?? (lease.tanks as any[])?.[0]
  const lastReading = readings?.[0]
  const pct = tank && lastReading
    ? Math.round((lastReading.bbls_on_hand / tank.capacity_bbls) * 100)
    : 0

  return (
    <LeaseDetailClient
      lease={lease}
      tank={tank}
      allTanks={lease.tanks as any[]}
      wells={lease.wells as any[]}
      readings={readings ?? []}
      lastReading={lastReading}
      pct={pct}
    />
  )
}
