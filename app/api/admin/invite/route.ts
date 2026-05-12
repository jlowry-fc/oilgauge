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

  const { email, full_name, tenant_id, role } = await request.json()
  if (!email || !full_name || !tenant_id) {
    return NextResponse.json({ error: 'email, full_name, and tenant_id are required' }, { status: 400 })
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Get tenant name for metadata
  const { data: tenant } = await adminSupabase
    .from('tenants').select('name').eq('id', tenant_id).single()

  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, company_name: tenant?.name, role: role ?? 'owner' },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Create profile immediately
  await adminSupabase.from('users').insert({
    id: data.user.id,
    tenant_id,
    full_name,
    role: role ?? 'owner',
    is_active: true,
  })

  return NextResponse.json({ ok: true })
}
