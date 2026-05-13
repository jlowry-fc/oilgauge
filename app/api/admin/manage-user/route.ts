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

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { action, user_id, password, role, tenant_id, full_name, is_active } = await request.json()

  // SET TEMPORARY PASSWORD
  if (action === 'set_password') {
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    const { error } = await adminSupabase.auth.admin.updateUserById(user_id, {
      password,
      user_metadata: { must_change_password: true },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  // UPDATE PROFILE (role, name, active status, tenant)
  if (action === 'update_profile') {
    const updates: any = {}
    if (role) updates.role = role
    if (full_name) updates.full_name = full_name
    if (is_active !== undefined) updates.is_active = is_active
    if (tenant_id) updates.tenant_id = tenant_id

    const { error } = await adminSupabase
      .from('users').update(updates).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  // DELETE USER
  if (action === 'delete_user') {
    const { error: profileErr } = await adminSupabase
      .from('users').delete().eq('id', user_id)
    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 400 })
    const { error: authErr } = await adminSupabase.auth.admin.deleteUser(user_id)
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
