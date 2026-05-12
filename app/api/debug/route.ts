import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) return NextResponse.json({ step: 'auth', error: authError.message })
    if (!user) return NextResponse.json({ step: 'auth', error: 'no user' })

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, full_name, role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError) return NextResponse.json({ 
      step: 'profile', 
      error: profileError.message, 
      code: profileError.code,
      userId: user.id 
    })

    return NextResponse.json({ ok: true, user: user.email, profile })
  } catch (e: any) {
    return NextResponse.json({ step: 'catch', error: e.message })
  }
}
