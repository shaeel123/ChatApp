import React, { useState, useRef } from 'react'
import './Login.css'
import assets from '../../assets/assets'
import { login, supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ReactDOM from 'react-dom'

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

const Login = () => {
  const [currState, setCurrState] = useState("Sign Up")
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

  // ✅ Security question recovery states
  const [showSecurityRecovery, setShowSecurityRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryQuestion, setRecoveryQuestion] = useState('')
  const [recoveryAnswer, setRecoveryAnswer] = useState('')
  const [recoveryStep, setRecoveryStep] = useState(1) // 1=enter email, 2=answer question, 3=set new password
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('')
  const [recoveryUserId, setRecoveryUserId] = useState(null)

  const otpRefs = useRef([])
  const navigate = useNavigate()

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { toast.error("Please enter your email."); return }
    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toast.success("Password reset link sent! Check your email.")
      setForgotEmail('')
      setShowForgot(false)
    } catch (err) {
      toast.error(err.message || "Failed to send reset link.")
    } finally {
      setForgotLoading(false)
    }
  }

  // ✅ Step 1: Look up user's security question by email
  const handleRecoveryEmailSubmit = async () => {
    if (!recoveryEmail.trim()) { toast.error("Please enter your email."); return }
    setRecoveryLoading(true)
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, security_question, security_answer')
        .eq('email', recoveryEmail.trim().toLowerCase())
        .maybeSingle()

      if (error || !profile) {
        toast.error("No account found with that email.")
        return
      }
      if (!profile.security_question || !profile.security_answer) {
        toast.error("This account has no security question set. Use email reset instead.")
        return
      }

      setRecoveryQuestion(profile.security_question)
      setRecoveryUserId(profile.id)
      setRecoveryStep(2)
    } catch (err) {
      toast.error("Something went wrong.")
    } finally {
      setRecoveryLoading(false)
    }
  }

  // ✅ Step 2: Verify answer
  const handleRecoveryAnswerSubmit = async () => {
    if (!recoveryAnswer.trim()) { toast.error("Please enter your answer."); return }
    setRecoveryLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('security_answer')
        .eq('id', recoveryUserId)
        .maybeSingle()

      if (!profile) { toast.error("Account not found."); return }

      const correct = profile.security_answer === recoveryAnswer.trim().toLowerCase()
      if (!correct) {
        toast.error("Incorrect answer. Please try again.")
        setRecoveryAnswer('')
        return
      }

      toast.success("Answer correct! Set your new password.")
      setRecoveryStep(3)
    } catch (err) {
      toast.error("Something went wrong.")
    } finally {
      setRecoveryLoading(false)
    }
  }

  // ✅ Step 3: Send password reset email (we verified identity via security Q)
  const handleRecoveryPasswordReset = async () => {
    if (!newRecoveryPassword.trim() || newRecoveryPassword.length < 6) {
      toast.error("Password must be at least 6 characters.")
      return
    }
    setRecoveryLoading(true)
    try {
      // Send reset link to their email — identity already verified
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toast.success("Password reset link sent to your email! Click it to set your new password.")
      setShowSecurityRecovery(false)
      setRecoveryStep(1)
      setRecoveryEmail('')
      setRecoveryAnswer('')
      setNewRecoveryPassword('')
    } catch (err) {
      toast.error(err.message || "Failed to send reset link.")
    } finally {
      setRecoveryLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!agreed) { toast.error("Please agree to the terms of use & privacy policy."); return }
    setLoading(true)
    try {
      if (currState === "Sign Up") {
        localStorage.clear()
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success("OTP sent to your email!")
        setShowOtp(true)
      } else {
        const res = await login(email, password)
        if (!res) {
          const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
          toast.error(!profile ? "No user found with this email." : "Invalid email or password. Please try again.")
          return
        }
        navigate('/chat')
      }
    } catch (err) {
      toast.error(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('')
    if (otpCode.length < 6) { toast.error("Please enter the complete 6-digit OTP."); return }
    setVerifying(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' })
      if (error) throw error
      if (data?.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, email, name: username, avatar_url: null })
      }
      toast.success("Email verified successfully!")
      navigate('/profile')
    } catch (err) {
      toast.error(err.message || "Invalid OTP. Please try again.")
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      toast.success("OTP resent!")
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err) {
      toast.error(err.message || "Failed to resend OTP.")
    }
  }

  // ✅ Security Question Recovery Screen
  if (showSecurityRecovery) {
    return (
      <div className='login'>
        <img src={assets.logo_big} alt="" className="logo" />
        <div className="login-form otp-form">
          {/* Step indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: recoveryStep >= s ? '#077eff' : '#e0e0e0',
                color: recoveryStep >= s ? 'white' : '#999',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, transition: 'background 0.3s'
              }}>{s}</div>
            ))}
          </div>

          {recoveryStep === 1 && (
            <>
              <h2>Account Recovery</h2>
              <p className="otp-subtitle">Enter the email address of the account you want to recover.</p>
              <input
                type="email" placeholder="Your email address" className="form-input"
                value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)}
              />
              <button onClick={handleRecoveryEmailSubmit} disabled={recoveryLoading} className="otp-verify-btn">
                {recoveryLoading ? 'Looking up...' : 'Continue'}
              </button>
            </>
          )}

          {recoveryStep === 2 && (
            <>
              <h2>Security Question</h2>
              <p className="otp-subtitle" style={{ fontWeight: 600, color: '#333', fontSize: 14, marginBottom: 16 }}>
                {recoveryQuestion}
              </p>
              <input
                type="text" placeholder="Your answer" className="form-input"
                value={recoveryAnswer} onChange={(e) => setRecoveryAnswer(e.target.value)}
              />
              <small style={{ color: '#999', fontSize: 12, marginBottom: 16, display: 'block' }}>
                Answer is case-insensitive
              </small>
              <button onClick={handleRecoveryAnswerSubmit} disabled={recoveryLoading} className="otp-verify-btn">
                {recoveryLoading ? 'Verifying...' : 'Verify Answer'}
              </button>
            </>
          )}

          {recoveryStep === 3 && (
            <>
              <h2>Identity Verified ✅</h2>
              <p className="otp-subtitle">
                Click below to receive a password reset link at<br />
                <strong>{recoveryEmail}</strong>
              </p>
              <button onClick={handleRecoveryPasswordReset} disabled={recoveryLoading} className="otp-verify-btn">
                {recoveryLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}

          <p className="otp-back" onClick={() => {
            setShowSecurityRecovery(false)
            setRecoveryStep(1)
            setRecoveryEmail('')
            setRecoveryAnswer('')
            setRecoveryQuestion('')
          }}>← Back to Login</p>
        </div>
      </div>
    )
  }

  if (showForgot) {
    return (
      <div className='login'>
        <img src={assets.logo_big} alt="" className="logo" />
        <div className="login-form otp-form">
          <h2>Reset Password</h2>
          <p className="otp-subtitle">Enter your email and we'll send you a password reset link.</p>
          <input
            type="email" placeholder="Your email address" className="form-input"
            value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
          />
          <button onClick={handleForgotPassword} disabled={forgotLoading} className="otp-verify-btn">
            {forgotLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          {/* ✅ Security question recovery link */}
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#666' }}>
            Lost access to your email?{' '}
            <span
              onClick={() => { setShowForgot(false); setShowSecurityRecovery(true) }}
              style={{ color: '#077eff', cursor: 'pointer', fontWeight: 600 }}
            >
              Recover via security question
            </span>
          </p>
          <p className="otp-back" onClick={() => { setShowForgot(false); setForgotEmail('') }}>← Back to Login</p>
        </div>
      </div>
    )
  }

  if (showOtp) {
    return (
      <div className='login'>
        <img src={assets.logo_big} alt="" className="logo" />
        <div className="login-form otp-form">
          <h2>Verify Email</h2>
          <p className="otp-subtitle">Enter the 6-digit OTP sent to<br /><strong>{email}</strong></p>
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index} ref={el => otpRefs.current[index] = el}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                className="otp-box" autoFocus={index === 0}
              />
            ))}
          </div>
          <button onClick={handleVerifyOtp} disabled={verifying} className="otp-verify-btn">
            {verifying ? 'Verifying...' : 'Verify OTP'}
          </button>
          <p className="otp-resend">
            Didn't receive it?{" "}
            <span onClick={handleResendOtp} style={{ cursor: 'pointer', color: '#077eff' }}>Resend OTP</span>
          </p>
          <p className="otp-back" onClick={() => { setShowOtp(false); setOtp(['', '', '', '', '', '']) }}>← Back</p>
        </div>
      </div>
    )
  }

  return (
    <div className='login'>
      <img src={assets.logo_big} alt="" className="logo" />

      {showTerms && ReactDOM.createPortal(
        <div
          onClick={() => setShowTerms(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, padding: '16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, width: '100%', maxWidth: 540,
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 40px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '18px 20px', borderBottom: '1px solid #eee',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Terms &amp; Conditions</h2>
              <button
                onClick={() => setShowTerms(false)}
                style={{
                  background: '#f0f0f0', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
            </div>
            <div style={{
              padding: '18px 20px', overflowY: 'auto', flex: 1,
              fontSize: 13, color: '#333', lineHeight: 1.7,
              whiteSpace: 'pre-wrap', fontFamily: 'inherit'
            }}>
              {TERMS_TEXT}
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #eee', textAlign: 'center' }}>
              <button
                onClick={() => { setAgreed(true); setShowTerms(false) }}
                style={{
                  background: '#077eff', color: 'white', border: 'none',
                  borderRadius: 10, padding: '10px 32px', cursor: 'pointer',
                  fontWeight: 600, fontSize: 14, width: '100%'
                }}
              >
                I Agree
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <form className="login-form" onSubmit={handleSubmit}>
        <h2>{currState}</h2>

        {currState === "Sign Up" && (
          <input
            id="username" name="username" type="text" placeholder="username"
            className="form-input" value={username}
            onChange={(e) => setUsername(e.target.value)} required
          />
        )}

        <input
          id="email" name="email" type="email" placeholder="Email address"
          className="form-input" value={email}
          onChange={(e) => setEmail(e.target.value)} required
        />

        <div className="password-wrapper">
          <input
            id="password" name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="password" className="form-input"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          <span className="toggle-password" onClick={() => setShowPassword(prev => !prev)}>
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </span>
        </div>

        <button type='submit' disabled={loading}>
          {loading ? 'Please wait...' : currState === "Sign Up" ? "Create account" : "Login now"}
        </button>

        <div className="login-term">
          <input
            id="agreed" name="agreed" type="checkbox"
            checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          />
          <span
            onClick={() => setShowTerms(true)}
            style={{ cursor: 'pointer', color: '#077eff', fontSize: 13 }}
          >
            Agree to the terms of use &amp; privacy policy
          </span>
        </div>

        <div className="login-forgot">
          {currState === "Sign Up" ? (
            <p className="login-toggle">Already have an account{" "}<span onClick={() => setCurrState("Login")}>Login here</span></p>
          ) : (
            <>
              <p className="login-toggle">Create an account{" "}<span onClick={() => setCurrState("Sign Up")}>Click here</span></p>
              <p className="forgot-link" onClick={() => setShowForgot(true)}>Forgot password?</p>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

export default Login