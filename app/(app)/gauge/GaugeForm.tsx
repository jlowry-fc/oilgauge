'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calcTotalInches, calcBbls, calcProduction, daysBetween, FRACTIONS, READING_TYPES, fractLabel } from '@/lib/calc'

type Tank = { id: string; name: string; capacity_bbls: number; bbls_per_inch: number; is_primary: boolean }
type Lease = { id: string; name: string; tanks: Tank[] }

export default function GaugeForm({ leases, pumperName, userId }: {
  leases: Lease[]; pumperName: string; userId: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedLease, setSelectedLease] = useState<Lease | null>(null)
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null)
  const [prevReading, setPrevReading] = useState<any>(null)
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [fraction, setFraction] = useState(0)
  const [reason, setReason] = useState('normal')
  const [readingDate, setReadingDate] = useState('')
  const [comments, setComments] = useState('')
  const [ticketNum, setTicketNum] = useState('')
  const [purchaser, setPurchaser] = useState('')
  const [ticketDate, setTicketDate] = useState('')
  const [bblsSold, setBblsSold] = useState('')
  const [preFt, setPreFt] = useState(''); const [preIn, setPreIn] = useState(''); const [preFrac, setPreFrac] = useState(0)
  const [postFt, setPostFt] = useState(''); const [postIn, setPostIn] = useState(''); const [postFrac, setPostFrac] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Set default datetime
  useEffect(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setReadingDate(now.toISOString().slice(0, 16))
  }, [])

  async function pickLease(lease: Lease) {
    setSelectedLease(lease)
    const tank = lease.tanks.find(t => t.is_primary) ?? lease.tanks[0]
    setSelectedTank(tank ?? null)
    setPrevReading(null)
    if (tank) {
      const { data } = await supabase
        .from('gauge_readings')
        .select('*, users(full_name)')
        .eq('tank_id', tank.id)
        .order('reading_date', { ascending: false })
        .limit(1)
        .single()
      setPrevReading(data)
    }
  }

  function changeLease() {
    setSelectedLease(null); setSelectedTank(null); setPrevReading(null)
    setFeet(''); setInches(''); setFraction(0); setComments('')
    setReason('normal'); setError('')
  }

  // Derived calc
  const ftN = parseInt(feet) || 0
  const inN = parseInt(inches) || 0
  const totalIn = calcTotalInches(ftN, inN, fraction)
  const currentBbls = selectedTank ? calcBbls(totalIn, selectedTank.bbls_per_inch) : 0
  const hasLevel = feet !== '' || inches !== ''
  const lastNormal = prevReading?.reading_type === 'normal' ? prevReading : null
  const delta = hasLevel && lastNormal ? calcProduction(currentBbls, lastNormal.bbls_on_hand,
    daysBetween(new Date(lastNormal.reading_date), new Date(readingDate))) : null
  const isNegative = delta && delta.delta < 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedLease || !selectedTank) return
    if (feet === '' || inches === '') { setError('Enter feet and inches.'); return }
    setSubmitting(true); setError('')

    // Find prev normal reading for the FK
    const { data: prevNormal } = await supabase
      .from('gauge_readings')
      .select('id, bbls_on_hand, reading_date')
      .eq('tank_id', selectedTank.id)
      .eq('reading_type', 'normal')
      .order('reading_date', { ascending: false })
      .limit(1)
      .single()

    const readingDateVal = reason === 'oil_sold' && ticketDate ? ticketDate + 'T12:00:00' : readingDate

    const payload: any = {
      tank_id: selectedTank.id,
      lease_id: selectedLease.id,
      pumper_id: userId,
      feet: ftN,
      inches: inN,
      inch_fraction: fraction,
      bbls_on_hand: currentBbls,
      reading_date: readingDateVal,
      reading_type: reason,
      comments: comments || null,
    }

    if (reason === 'normal' && prevNormal) {
      const days = daysBetween(new Date(prevNormal.reading_date), new Date(readingDateVal))
      const prod = calcProduction(currentBbls, prevNormal.bbls_on_hand, days)
      payload.prev_reading_id = prevNormal.id
      payload.bbls_since_last = prod.delta
      payload.days_since_last = days
      payload.bbls_per_day = prod.bblsPerDay
    }

    if (reason === 'oil_sold') {
      payload.ticket_number = ticketNum || null
      payload.purchaser_name = purchaser || null
      payload.bbls_sold = bblsSold ? parseFloat(bblsSold) : null
      payload.ticket_date = ticketDate || null
    }

    const { error: insertError } = await supabase.from('gauge_readings').insert(payload)
    if (insertError) { setError(insertError.message); setSubmitting(false); return }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ maxWidth:'520px', margin:'0 auto' }}>
      <h1 className="serif" style={{ fontSize:'24px', marginBottom:'4px' }}>Submit Gauge Reading</h1>
      <p style={{ color:'var(--text2)', fontSize:'13px', marginBottom:'20px' }}>
        Logged as: <strong style={{ color:'var(--text)' }}>{pumperName}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        {/* Lease selection */}
        <div style={{ marginBottom:'20px' }}>
          <label className="form-label">Select Lease</label>

          {!selectedLease ? (
            <div style={{ display:'grid', gap:'8px' }}>
              {leases.length === 0 && (
                <p style={{ color:'var(--text3)', fontSize:'13px' }}>No leases found. <a href="/leases/new" style={{ color:'var(--accent)' }}>Add one first.</a></p>
              )}
              {leases.map(l => (
                <button key={l.id} type="button" onClick={() => pickLease(l)}
                  style={{ padding:'16px', background:'var(--bg3)', border:'1.5px solid var(--border2)', borderRadius:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .15s', fontFamily:'inherit' }}>
                  <div style={{ textAlign:'left' }}>
                    <div style={{ fontSize:'16px', fontWeight:600, color:'var(--text)' }}>{l.name}</div>
                    <div style={{ fontSize:'12px', color:'var(--text2)', marginTop:'2px' }}>{l.tanks?.[0]?.capacity_bbls} BBL tank</div>
                  </div>
                  <span className="mono" style={{ fontSize:'18px', color:'var(--accent)' }}>›</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding:'14px 16px', background:'var(--bg3)', border:'1.5px solid var(--accent)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:'16px', fontWeight:600, color:'var(--text)' }}>{selectedLease.name}</div>
                <div style={{ fontSize:'12px', color:'var(--text2)', marginTop:'2px' }}>
                  {selectedTank?.capacity_bbls} BBL · {selectedTank?.bbls_per_inch} BBL/in
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={changeLease}>Change</button>
            </div>
          )}
        </div>

        {selectedLease && (
          <>
            {/* Previous reading */}
            {prevReading && (
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'12px', padding:'14px', marginBottom:'20px' }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:'10px' }}>
                  Last Reading — {selectedLease.name}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px' }}>
                  {[
                    ['Date', new Date(prevReading.reading_date).toLocaleDateString()],
                    ['Pumper', prevReading.users?.full_name ?? '—'],
                    ['Type', prevReading.reading_type],
                    ['Level', `${prevReading.feet} ft ${prevReading.inches} in`],
                    ['BBLs', prevReading.bbls_on_hand],
                    ['BBL/day', prevReading.bbls_per_day?.toFixed(2) ?? '—'],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize:'10px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'3px' }}>{label}</div>
                      <div className="mono" style={{ fontSize:'13px', color:'var(--text)' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reading date */}
            <div style={{ marginBottom:'16px' }}>
              <label className="form-label">Reading Date & Time</label>
              <input type="datetime-local" className="form-input" value={readingDate} onChange={e => setReadingDate(e.target.value)} />
              <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:'4px' }}>Change for backdated run tickets</div>
            </div>

            {/* Tank level */}
            <div style={{ marginBottom:'16px' }}>
              <label className="form-label">Tank Level</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Feet</div>
                  <input type="number" inputMode="numeric" className="form-input" value={feet} onChange={e => setFeet(e.target.value)} min="0" max="30" placeholder="0" />
                </div>
                <div>
                  <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Inches</div>
                  <input type="number" inputMode="numeric" className="form-input" value={inches} onChange={e => setInches(e.target.value)} min="0" max="11" placeholder="0" />
                </div>
                <div>
                  <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Fraction</div>
                  <select className="form-input" value={fraction} onChange={e => setFraction(parseFloat(e.target.value))}>
                    {FRACTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Live calc preview */}
            {hasLevel && selectedTank && (
              <div style={{ background:'var(--bg3)', border:`1.5px solid ${isNegative ? 'var(--red)' : 'var(--accent)'}`, borderRadius:'12px', padding:'14px', marginBottom:'16px' }}>
                <div style={{ fontSize:'12px', fontWeight:600, color:'var(--accent)', marginBottom:'8px' }}>Calculated Results</div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', marginBottom:'4px' }}>
                  <span style={{ color:'var(--text2)' }}>BBLs on hand</span>
                  <span className="mono" style={{ color:'var(--text)' }}>{currentBbls}</span>
                </div>
                {reason === 'normal' && delta && (
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', marginBottom:'4px' }}>
                      <span style={{ color:'var(--text2)' }}>Δ since last</span>
                      <span className="mono" style={{ color: delta.delta < 0 ? 'var(--red)' : 'var(--green)' }}>
                        {delta.delta > 0 ? '+' : ''}{delta.delta} BBLs
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px' }}>
                      <span style={{ color:'var(--text2)' }}>BBL/day</span>
                      <span className="mono" style={{ color:'var(--text)' }}>{delta.bblsPerDay}</span>
                    </div>
                  </>
                )}
                {isNegative && reason === 'normal' && (
                  <div style={{ marginTop:'8px', fontSize:'12px', color:'var(--red)' }}>
                    ⚠ Reading lower than last gauge — confirm or change reason to Oil Sold / Correction
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div style={{ marginBottom:'16px' }}>
              <label className="form-label">Reason for Reading</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                {READING_TYPES.map(rt => (
                  <button key={rt.value} type="button"
                    className={`reason-btn ${reason === rt.value ? (rt.value === 'oil_sold' ? 'active-blue' : 'active') : ''}`}
                    onClick={() => setReason(rt.value)}>
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Run ticket fields */}
            {reason === 'oil_sold' && (
              <div style={{ background:'rgba(91,156,246,0.07)', border:'1px solid rgba(91,156,246,0.2)', borderRadius:'12px', padding:'16px', marginBottom:'16px' }}>
                <div style={{ fontSize:'12px', fontWeight:600, color:'var(--blue)', marginBottom:'12px' }}>Run Ticket Information</div>
                <div style={{ marginBottom:'10px' }}>
                  <label className="form-label">Ticket Number</label>
                  <input type="text" className="form-input" value={ticketNum} onChange={e => setTicketNum(e.target.value)} placeholder="e.g. 00421" />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                  <div>
                    <label className="form-label">Purchaser</label>
                    <input type="text" className="form-input" value={purchaser} onChange={e => setPurchaser(e.target.value)} placeholder="Plains Marketing" />
                  </div>
                  <div>
                    <label className="form-label">Pickup Date</label>
                    <input type="date" className="form-input" value={ticketDate} onChange={e => setTicketDate(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom:'12px' }}>
                  <label className="form-label">BBLs Sold (from ticket)</label>
                  <input type="number" className="form-input" value={bblsSold} onChange={e => setBblsSold(e.target.value)} placeholder="0.00" step="0.01" />
                </div>
                <div style={{ borderTop:'1px solid rgba(91,156,246,0.2)', paddingTop:'12px', marginBottom:'10px' }}>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'var(--blue)', marginBottom:'8px' }}>Pre-Sale Gauge (from ticket)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                    <div><div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Feet</div><input type="number" className="form-input" value={preFt} onChange={e=>setPreFt(e.target.value)} min="0" max="30" placeholder="0" /></div>
                    <div><div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Inches</div><input type="number" className="form-input" value={preIn} onChange={e=>setPreIn(e.target.value)} min="0" max="11" placeholder="0" /></div>
                    <div><div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Fraction</div>
                      <select className="form-input" value={preFrac} onChange={e=>setPreFrac(parseFloat(e.target.value))}>
                        {FRACTIONS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                      </select></div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'var(--blue)', marginBottom:'8px' }}>Post-Sale Gauge (from ticket)</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                    <div><div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Feet</div><input type="number" className="form-input" value={postFt} onChange={e=>setPostFt(e.target.value)} min="0" max="30" placeholder="0" /></div>
                    <div><div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Inches</div><input type="number" className="form-input" value={postIn} onChange={e=>setPostIn(e.target.value)} min="0" max="11" placeholder="0" /></div>
                    <div><div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'4px' }}>Fraction</div>
                      <select className="form-input" value={postFrac} onChange={e=>setPostFrac(parseFloat(e.target.value))}>
                        {FRACTIONS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                      </select></div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments */}
            <div style={{ marginBottom:'20px' }}>
              <label className="form-label">Comments</label>
              <textarea className="form-input" value={comments} onChange={e => setComments(e.target.value)} rows={2} placeholder="Optional notes…" style={{ resize:'vertical' }} />
            </div>

            {error && (
              <div style={{ background:'rgba(232,85,85,0.1)', border:'1px solid rgba(232,85,85,0.3)', borderRadius:'8px', padding:'10px 14px', color:'var(--red)', fontSize:'13px', marginBottom:'16px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ width:'100%', padding:'16px', fontSize:'16px', borderRadius:'12px', justifyContent:'center' }}
              disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Gauge Reading'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
