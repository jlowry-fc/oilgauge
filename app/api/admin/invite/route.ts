import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Verify the caller is a super_admin
  const serverSupabase = createServerClient()
  const { data: { user } } = await serverSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await serverSupabase
    .from('users').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, full_name, company_name, role } = await request.json()
  if (!email || !full_name || !company_name) {
    return NextResponse.json({ error: 'email, full_name, and company_name are required' }, { status: 400 })
  }

  // Use service role key for admin operations
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Invite user — Supabase sends the email automatically
  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, company_name, role: role ?? 'owner' },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, user_id: data.user.id })
}
