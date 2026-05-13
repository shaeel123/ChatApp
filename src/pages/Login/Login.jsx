import React, { useState, useRef } from 'react'
import './Login.css'
import assets from '../../assets/assets'
import { login, supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const Login = () => {
  const [currState, setCurrState] = useState("Sign Up")
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [verifying, setVerifying] = useState(false)
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

  // ✅ Forgot password — send reset link to email
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
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()
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
      const { data, error } = await supabase.auth.verifyOtp({
        email, token: otpCode, type: 'signup',
      })
      if (error) throw error
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id, email, name: username, avatar_url: null
        })
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

  // ✅ Forgot password screen
  if (showForgot) {
    return (
      <div className='login'>
        <img src={assets.logo_big} alt="" className="logo" />
        <div className="login-form otp-form">
          <h2>Reset Password</h2>
          <p className="otp-subtitle">
            Enter your email and we'll send you a password reset link.
          </p>
          <input
            type="email"
            placeholder="Your email address"
            className="form-input"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
          <button
            onClick={handleForgotPassword}
            disabled={forgotLoading}
            className="otp-verify-btn"
          >
            {forgotLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p
            className="otp-back"
            onClick={() => { setShowForgot(false); setForgotEmail('') }}
          >
            ← Back to Login
          </p>
        </div>
      </div>
    )
  }

  // ✅ OTP screen
  if (showOtp) {
    return (
      <div className='login'>
        <img src={assets.logo_big} alt="" className="logo" />
        <div className="login-form otp-form">
          <h2>Verify Email</h2>
          <p className="otp-subtitle">
            Enter the 6-digit OTP sent to<br />
            <strong>{email}</strong>
          </p>
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => otpRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                className="otp-box"
                autoFocus={index === 0}
              />
            ))}
          </div>
          <button onClick={handleVerifyOtp} disabled={verifying} className="otp-verify-btn">
            {verifying ? 'Verifying...' : 'Verify OTP'}
          </button>
          <p className="otp-resend">
            Didn't receive it?{" "}
            <span onClick={handleResendOtp} style={{ cursor: 'pointer', color: '#077eff' }}>
              Resend OTP
            </span>
          </p>
          <p className="otp-back" onClick={() => { setShowOtp(false); setOtp(['', '', '', '', '', '']) }}>
            ← Back
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='login'>
      <img src={assets.logo_big} alt="" className="logo" />

      <form className="login-form" onSubmit={handleSubmit}>
        <h2>{currState}</h2>

        {currState === "Sign Up" && (
          <input
            id="username" name="username" type="text" placeholder="username"
            className="form-input" value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}

        <input
          id="email" name="email" type="email" placeholder="Email address"
          className="form-input" value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          id="password" name="password" type="password" placeholder="password"
          className="form-input" value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type='submit' disabled={loading}>
          {loading ? 'Please wait...' : currState === "Sign Up" ? "Create account" : "Login now"}
        </button>

        <div className="login-term">
          <input
            id="agreed" name="agreed" type="checkbox"
            checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
          />
          <a href='https://blank.page/' target='_blank' rel="noopener noreferrer">
            Agree to the terms of use & privacy policy
          </a>
        </div>

        <div className="login-forgot">
          {currState === "Sign Up" ? (
            <p className="login-toggle">
              Already have an account{" "}
              <span onClick={() => setCurrState("Login")}>Login here</span>
            </p>
          ) : (
            <>
              <p className="login-toggle">
                Create an account{" "}
                <span onClick={() => setCurrState("Sign Up")}>Click here</span>
              </p>
              {/* ✅ Forgot password link */}
              <p className="forgot-link" onClick={() => setShowForgot(true)}>
                Forgot password?
              </p>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

export default Login