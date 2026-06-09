import React, { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import assets from '../../assets/assets'

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_171521_25968ba2-b594-4b32-aab7-f6b69398a6fa.mp4'

const S = {
  page: { position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontFamily: "'Inter',sans-serif" },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 },
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,12,35,0.68)', backdropFilter: 'blur(1px)', zIndex: 1 },
  content: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '40px 20px' },
  logo: { width: 'max(18vw, 160px)', marginBottom: 36 },
  card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 22, padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 18, width: '100%', maxWidth: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' },
  h2: { fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 26, color: 'white', letterSpacing: '-0.3px', margin: 0 },
  input: { padding: '11px 14px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, outline: 'none', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 14, fontFamily: "'Inter',sans-serif", width: '100%', boxSizing: 'border-box' },
  btn: { padding: '12px', background: 'rgba(255,255,255,0.92)', color: '#0a0a0a', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: "'Inter',sans-serif" },
  muted: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
}

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  const focusStyle = e => { e.target.style.borderColor = 'rgba(255,255,255,0.35)'; e.target.style.background = 'rgba(255,255,255,0.1)' }
  const blurStyle = e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    if (password !== confirm) { toast.error("Passwords don't match."); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      await supabase.auth.signOut()
      toast.success('Password reset successfully!')
      window.location.replace('/')
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.')
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap'); input::placeholder { color: rgba(255,255,255,0.35) !important; }`}</style>
      <video src={VIDEO_URL} autoPlay loop muted playsInline style={S.video} />
      <div style={S.overlay} />
      <div style={S.content}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
  <img src={assets.logo_icon} alt="" style={{ width: '80px' }} />
  <span style={{ color: 'white', fontSize: '32px', fontWeight: '600' }}>BlueC</span>
</div>
        <div style={S.card}>
          <h2 style={S.h2}>Set New Password</h2>
          {!ready ? (
            <p style={S.muted}>Verifying reset link...</p>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="password" placeholder="New password" value={password}
                onChange={e => setPassword(e.target.value)} required
                style={S.input} onFocus={focusStyle} onBlur={blurStyle} />
              <input type="password" placeholder="Confirm new password" value={confirm}
                onChange={e => setConfirm(e.target.value)} required
                style={S.input} onFocus={focusStyle} onBlur={blurStyle} />
              <button type="submit" disabled={loading} style={S.btn}
                onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
                onMouseLeave={e => e.target.style.transform = 'scale(1)'}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword