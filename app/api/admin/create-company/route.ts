import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const serverSupabase = createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await serverSupabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { company_name, owner_email, owner_name } = await request.json()
  if (!company_name || !owner_email || !owner_name) {
    return NextResponse.json({ error: 'company_name, owner_email, and owner_name are required' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Create the tenant
  const { data: tenant, error: tenantErr } = await adminSupabase
    .from('tenants')
    .insert({ name: company_name })
    .select()
    .single()

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 400 })

  // 2. Invite the owner — trigger will be skipped since we handle profile manually
  const { data: inviteData, error: inviteErr } = await adminSupabase.auth.admin.inviteUserByEmail(owner_email, {
    data: {
      full_name: owner_name,
      company_name,
      role: 'owner',
      tenant_id: tenant.id, // pass so trigger can use it
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  })

  if (inviteErr) {
    // Rollback tenant
    await adminSupabase.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: inviteErr.message }, { status: 400 })
  }

  // 3. Create user profile immediately (don't wait for trigger)
  await adminSupabase.from('users').insert({
    id: inviteData.user.id,
    tenant_id: tenant.id,
    full_name: owner_name,
    role: 'owner',
    is_active: true,
  })

  return NextResponse.json({ ok: true, tenant_id: tenant.id })
}
