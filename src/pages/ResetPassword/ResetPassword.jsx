import React, { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import assets from '../../assets/assets'
import './ResetPassword.css'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // ✅ Listen for PASSWORD_RECOVERY event — fires when token in URL is valid
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, session)
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e) => {
  e.preventDefault()
  if (password !== confirm) { toast.error("Passwords don't match."); return }
  if (password.length < 6) { toast.error("Password must be at least 6 characters."); return }

  setLoading(true)
  try {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error

    await supabase.auth.signOut()
    toast.success("Password reset successfully!")
    
    // ✅ force redirect immediately
    window.location.replace('/')

  } catch (err) {
    toast.error(err.message || "Failed to reset password.")
    setLoading(false)
  }
}

  return (
    <div className='reset-password'>
      <img src={assets.logo_big} alt="" className="logo" />
      <form className="login-form" onSubmit={handleReset}>
        <h2>Set New Password</h2>
        {!ready ? (
          <p style={{ color: 'gray', fontSize: '14px' }}>
            Waiting for reset link verification...
          </p>
        ) : (
          <>
            <input
              type="password"
              placeholder="New password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className="form-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}

export default ResetPassword