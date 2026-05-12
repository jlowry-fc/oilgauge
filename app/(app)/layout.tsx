import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ minHeight:'100vh' }}>
      <Nav userName={profile?.full_name ?? user.email ?? ''} />
      <main style={{ padding:'20px', maxWidth:'1100px', margin:'0 auto' }}>
        {children}
      </main>
    </div>
  )
}
