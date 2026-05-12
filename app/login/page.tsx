'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
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

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'400px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <h1 className="serif" style={{ fontSize:'36px', color:'var(--accent)', marginBottom:'6px' }}>OilGauge</h1>
          <p style={{ color:'var(--text2)', fontSize:'14px' }}>Production tracking for oil operators</p>
        </div>

        <div className="card">
          {!showReset ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom:'16px' }}>
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com" required autoComplete="email" />
              </div>
              <div style={{ marginBottom:'20px' }}>
                <label className="form-label">Password</label>
                <input type="password" className="form-input" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password" />
              </div>
              {error && (
                <div style={{ background:'rgba(232,85,85,0.1)', border:'1px solid rgba(232,85,85,0.3)', borderRadius:'8px', padding:'10px 14px', color:'var(--red)', fontSize:'13px', marginBottom:'16px' }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary"
                style={{ width:'100%', padding:'14px', fontSize:'16px', justifyContent:'center', marginBottom:'12px' }}
                disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <div style={{ textAlign:'center' }}>
                <button type="button" onClick={() => { setShowReset(true); setError('') }}
                  style={{ background:'none', border:'none', color:'var(--text3)', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
                  Forgot password?
                </button>
              </div>
            </form>
          ) : resetSent ? (
            <div style={{ textAlign:'center', padding:'10px 0' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>📬</div>
              <div style={{ color:'var(--green)', fontWeight:600, marginBottom:'8px' }}>Check your email</div>
              <div style={{ color:'var(--text2)', fontSize:'13px', marginBottom:'20px' }}>
                Password reset link sent to {email}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowReset(false); setResetSent(false) }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <div style={{ marginBottom:'8px', color:'var(--text2)', fontSize:'13px' }}>
                Enter your email and we'll send a reset link.
              </div>
              <div style={{ marginBottom:'16px', marginTop:'16px' }}>
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com" required autoComplete="email" />
              </div>
              {error && (
                <div style={{ background:'rgba(232,85,85,0.1)', border:'1px solid rgba(232,85,85,0.3)', borderRadius:'8px', padding:'10px 14px', color:'var(--red)', fontSize:'13px', marginBottom:'16px' }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary"
                style={{ width:'100%', padding:'14px', fontSize:'16px', justifyContent:'center', marginBottom:'12px' }}
                disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <div style={{ textAlign:'center' }}>
                <button type="button" onClick={() => { setShowReset(false); setError('') }}
                  style={{ background:'none', border:'none', color:'var(--text3)', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign:'center', color:'var(--text3)', fontSize:'12px', marginTop:'16px' }}>
          Access by invitation only
        </p>
      </div>
    </div>
  )
}
