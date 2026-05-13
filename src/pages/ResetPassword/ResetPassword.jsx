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
    // ✅ Supabase puts the token in the URL hash — check session is valid
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true)
      else toast.error("Invalid or expired reset link.")
    })
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
      toast.success("Password reset successfully! Please log in.")
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      toast.error(err.message || "Failed to reset password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='reset-password'>
      <img src={assets.logo_big} alt="" className="logo" />
      <form className="login-form" onSubmit={handleReset}>
        <h2>Set New Password</h2>
        {!ready ? (
          <p style={{ color: 'gray', fontSize: '14px' }}>Verifying reset link...</p>
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