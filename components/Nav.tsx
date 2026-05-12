'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/gauge', label: 'Submit Gauge' },
  { href: '/leases', label: 'Leases' },
  { href: '/reports', label: 'Reports' },
]

export default function Nav({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px' }}>
        <span className="serif" style={{ fontSize:'20px', color:'var(--accent)' }}>OilGauge <span style={{ color:'var(--text2)', fontFamily:'DM Sans', fontSize:'12px', fontWeight:500 }}>Pro</span></span>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'13px', color:'var(--text2)', display:'none' }} className="desktop-only">{userName}</span>
          <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </div>
      <div style={{ display:'flex', gap:'4px', padding:'0 20px', overflowX:'auto' }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            padding:'10px 16px', fontSize:'13px', fontWeight:500, whiteSpace:'nowrap',
            color: pathname.startsWith(l.href) ? 'var(--accent)' : 'var(--text2)',
            borderBottom: pathname.startsWith(l.href) ? '2px solid var(--accent)' : '2px solid transparent',
            textDecoration:'none', transition:'all .15s'
          }}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
