import React, { useState, useRef } from 'react'
import assets from '../../assets/assets'
import { login, supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ReactDOM from 'react-dom'

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_171521_25968ba2-b594-4b32-aab7-f6b69398a6fa.mp4'

const TERMS_TEXT = `Terms and Conditions for Chat App
Last updated: May 23, 2026

INTERPRETATION AND DEFINITIONS

The words whose initial letters are capitalized have meanings defined under the following conditions.

Definitions:
• Affiliate means an entity that controls, is controlled by, or is under common control with a party.
• Country refers to: Karnataka, India
• Company refers to chat app.
• Device means any device that can access the Service such as a computer, a cell phone or a digital tablet.
• Service refers to the Website.
• Website refers to chat app, accessible from https://chat-app-two-hazel.vercel.app/
• You means the individual accessing or using the Service.

ACKNOWLEDGMENT

These Terms govern the use of this Service and the agreement between You and the Company. Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms.

By accessing or using the Service You agree to be bound by these Terms. You represent that you are over the age of 18. The Company does not permit those under 18 to use the Service.

LINKS TO OTHER WEBSITES

Our Service may contain links to third-party websites or services that are not owned or controlled by the Company. The Company has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third-party websites or services.

TERMINATION

We may terminate or suspend Your access immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms. Upon termination, Your right to use the Service will cease immediately.

LIMITATION OF LIABILITY

To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever, including but not limited to damages for loss of profits, loss of data, business interruption, or personal injury.

"AS IS" AND "AS AVAILABLE" DISCLAIMER

The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind. The Company expressly disclaims all warranties, whether express, implied, statutory or otherwise.

GOVERNING LAW

The laws of Karnataka, India, excluding its conflicts of law rules, shall govern these Terms and Your use of the Service.

DISPUTES RESOLUTION

If You have any concern or dispute about the Service, You agree to first try to resolve the dispute informally by contacting the Company.

SEVERABILITY AND WAIVER

If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law.

CHANGES TO THESE TERMS

We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. By continuing to access or use Our Service after revisions become effective, You agree to be bound by the revised terms.

CONTACT US

If you have any questions about these Terms and Conditions:
Email: mohammedshaeel564@gmail.com`

const S = {
  page: {
    position: 'relative', minHeight: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', fontFamily: "'Inter', sans-serif",
  },
  video: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', zIndex: 0,
  },
  overlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(0,15,40,0.72) 0%, rgba(0,8,25,0.65) 100%)',
    backdropFilter: 'blur(1px)', zIndex: 1,
  },
  content: {
    position: 'relative', zIndex: 2,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    width: '100%', padding: '40px 20px',
  },
  logo: { width: 'max(18vw, 160px)', marginBottom: 36 },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 22,
    padding: '36px 40px',
    display: 'flex', flexDirection: 'column', gap: 18,
    width: '100%', maxWidth: 380,
    boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
    animation: 'fadeRise 0.7s ease-out both',
  },
  h2: {
    fontFamily: "'Instrument Serif', serif",
    fontWeight: 400, fontSize: 28, color: 'white',
    letterSpacing: '-0.5px', margin: 0,
  },
  input: {
    padding: '11px 14px',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, outline: 'none',
    background: 'rgba(255,255,255,0.06)',
    color: 'white', fontSize: 14,
    fontFamily: "'Inter', sans-serif",
    transition: 'border 0.2s, background 0.2s',
    width: '100%', boxSizing: 'border-box',
  },
  btn: {
    padding: '12px', background: 'rgba(255,255,255,0.92)',
    color: '#0a0a0a', fontSize: 14, fontWeight: 700,
    border: 'none', borderRadius: 10, cursor: 'pointer',
    transition: 'transform 0.2s, background 0.2s',
    fontFamily: "'Inter', sans-serif",
  },
  otpBox: {
    width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, outline: 'none',
    background: 'rgba(255,255,255,0.06)', color: 'white',
    fontFamily: "'Inter', sans-serif",
  },
  muted: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  link: { color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontWeight: 600 },
  back: { fontSize: 13, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', textAlign: 'center', marginTop: 4 },
  forgot: { fontSize: 13, color: '#ff8787', cursor: 'pointer', textAlign: 'center' },
  pwWrap: { position: 'relative' },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', background: 'none', border: 'none', padding: 0,
  },
  termRow: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  termLink: { color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 500 },
}

const VideoBackground = () => (
  <>
    <video src={VIDEO_URL} autoPlay loop muted playsInline style={S.video} />
    <div style={S.overlay} />
  </>
)

const Login = () => {
  const [currState, setCurrState] = useState('Sign Up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const otpRefs = useRef([])
  const navigate = useNavigate()

  const focusStyle = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.35)'; e.target.style.background = 'rgba(255,255,255,0.1)' }
  const blurStyle = (e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.06)' }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]; newOtp[index] = value.slice(-1); setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus() }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { toast.error('Please enter your email.'); return }
    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/reset-password` })
      if (error) throw error
      toast.success('Password reset link sent! Check your email.')
      setForgotEmail(''); setShowForgot(false)
    } catch (err) { toast.error(err.message || 'Failed to send reset link.') }
    finally { setForgotLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agreed) { toast.error('Please agree to the terms of use & privacy policy.'); return }
    setLoading(true)
    try {
      if (currState === 'Sign Up') {
        localStorage.clear()
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('OTP sent to your email!'); setShowOtp(true)
      } else {
        const res = await login(email, password)
        if (!res) {
          const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
          toast.error(!profile ? 'No user found with this email.' : 'Invalid email or password.')
          return
        }
        navigate('/chat')
      }
    } catch (err) { toast.error(err.message || 'Something went wrong.') }
    finally { setLoading(false) }
  }

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('')
    if (otpCode.length < 6) { toast.error('Please enter the complete 6-digit OTP.'); return }
    setVerifying(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' })
      if (error) throw error
      if (data?.user) await supabase.from('profiles').upsert({ id: data.user.id, email, name: username, avatar_url: null })
      toast.success('Email verified successfully!'); navigate('/profile')
    } catch (err) {
      toast.error(err.message || 'Invalid OTP.')
      setOtp(['', '', '', '', '', '']); otpRefs.current[0]?.focus()
    } finally { setVerifying(false) }
  }

  const handleResendOtp = async () => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      toast.success('OTP resent!'); setOtp(['', '', '', '', '', '']); otpRefs.current[0]?.focus()
    } catch (err) { toast.error(err.message || 'Failed to resend OTP.') }
  }

  // ── Terms Modal ──
  const TermsModal = () => showTerms ? ReactDOM.createPortal(
    <div onClick={() => setShowTerms(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,12,30,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', overflow: 'hidden', backdropFilter: 'blur(20px)' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'white', fontFamily: "'Instrument Serif', serif" }}>Terms & Conditions</h2>
          <button onClick={() => setShowTerms(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'white', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{TERMS_TEXT}</div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <button onClick={() => { setAgreed(true); setShowTerms(false) }} style={{ ...S.btn, width: '100%' }}>I Agree</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  // ── Forgot Password ──
  if (showForgot) return (
    <div style={S.page}>
      <VideoBackground />
      <div style={S.content}>
        <img src={assets.logo_big} alt="" style={S.logo} />
        <div style={S.card}>
          <h2 style={S.h2}>Reset Password</h2>
          <p style={{ ...S.muted, textAlign: 'left' }}>Enter your email and we'll send you a reset link.</p>
          <input type="email" placeholder="Your email address" value={forgotEmail}
            onChange={e => setForgotEmail(e.target.value)}
            style={S.input} onFocus={focusStyle} onBlur={blurStyle} />
          <button onClick={handleForgotPassword} disabled={forgotLoading} style={S.btn}
            onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}>
            {forgotLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p style={S.back} onClick={() => { setShowForgot(false); setForgotEmail('') }}>← Back to Login</p>
        </div>
      </div>
    </div>
  )

  // ── OTP ──
  if (showOtp) return (
    <div style={S.page}>
      <VideoBackground />
      <div style={S.content}>
        <img src={assets.logo_big} alt="" style={S.logo} />
        <div style={S.card}>
          <h2 style={S.h2}>Verify Email</h2>
          <p style={S.muted}>Enter the 6-digit OTP sent to<br /><strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong></p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {otp.map((digit, index) => (
              <input key={index} ref={el => otpRefs.current[index] = el}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                style={S.otpBox} autoFocus={index === 0} />
            ))}
          </div>
          <button onClick={handleVerifyOtp} disabled={verifying} style={S.btn}
            onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}>
            {verifying ? 'Verifying...' : 'Verify OTP'}
          </button>
          <p style={S.muted}>Didn't receive it?{' '}
            <span onClick={handleResendOtp} style={S.link}>Resend OTP</span>
          </p>
          <p style={S.back} onClick={() => { setShowOtp(false); setOtp(['', '', '', '', '', '']) }}>← Back</p>
        </div>
      </div>
    </div>
  )

  // ── Main Login/Signup ──
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap');
        @keyframes fadeRise { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        input::placeholder { color: rgba(255,255,255,0.35) !important; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px rgba(255,255,255,0.06) inset !important; -webkit-text-fill-color: white !important; }
      `}</style>
      <VideoBackground />
      <TermsModal />
      <div style={S.content}>
        <img src={assets.logo_big} alt="" style={{ ...S.logo, animation: 'fadeRise 0.6s ease-out both' }} />
        <div style={S.card}>
          <h2 style={S.h2}>{currState === 'Sign Up' ? 'Create account' : 'Welcome back'}</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {currState === 'Sign Up' && (
              <input type="text" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value)} required
                style={S.input} onFocus={focusStyle} onBlur={blurStyle} />
            )}
            <input type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)} required
              style={S.input} onFocus={focusStyle} onBlur={blurStyle} />
            <div style={S.pwWrap}>
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} required
                style={{ ...S.input, paddingRight: 40 }} onFocus={focusStyle} onBlur={blurStyle} />
              <button type="button" style={S.eyeBtn} onClick={() => setShowPassword(p => !p)}>
                {showPassword ? (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            <button type="submit" disabled={loading} style={S.btn}
              onMouseEnter={e => { if (!loading) e.target.style.transform = 'scale(1.02)' }}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}>
              {loading ? 'Please wait...' : currState === 'Sign Up' ? 'Create Account' : 'Login Now'}
            </button>
          </form>

          <div style={S.termRow}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: '#077eff', cursor: 'pointer' }} />
            <span onClick={() => setShowTerms(true)} style={S.termLink}>Agree to terms of use & privacy policy</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currState === 'Sign Up' ? (
              <p style={S.muted}>Already have an account?{' '}
                <span onClick={() => setCurrState('Login')} style={S.link}>Login here</span>
              </p>
            ) : (
              <>
                <p style={S.muted}>Don't have an account?{' '}
                  <span onClick={() => setCurrState('Sign Up')} style={S.link}>Sign up</span>
                </p>
                <p style={S.forgot} onClick={() => setShowForgot(true)}>Forgot password?</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login