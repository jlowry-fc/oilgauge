'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'400px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <h1 className="serif" style={{ fontSize:'36px', color:'var(--accent)', marginBottom:'6px' }}>OilGauge</h1>
          <p style={{ color:'var(--text2)', fontSize:'14px' }}>Production tracking for oil operators</p>
        </div>
        <div className="card">
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:'16px' }}>
              <label className="form-label">Email</label>
              <input
                type="email" className="form-input" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com" required autoComplete="email"
              />
            </div>
            <div style={{ marginBottom:'20px' }}>
              <label className="form-label">Password</label>
              <input
                type="password" className="form-input" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
              />
            </div>
            {error && (
              <div style={{ background:'rgba(232,85,85,0.1)', border:'1px solid rgba(232,85,85,0.3)', borderRadius:'8px', padding:'10px 14px', color:'var(--red)', fontSize:'13px', marginBottom:'16px' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width:'100%', padding:'14px', fontSize:'16px', justifyContent:'center' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
