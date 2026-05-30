import React, { useState, useEffect } from 'react'
import './ProfileUpdate.css'
import assets from '../../assets/assets'
import { supabase } from '../../config/supabase'
import { useAppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const ProfileUpdate = () => {
  const [image, setImage] = useState(false)
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [changingEmail, setChangingEmail] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const navigate = useNavigate()
  const { loadUserData, userData } = useAppContext()

  useEffect(() => {
    if (userData) {
      setName(userData.name || "")
      setBio(userData.bio || "")
      setPhone(userData.phone || "")
    }
  }, [userData])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'USER_UPDATED' && session?.user?.email) {
        await supabase.from('profiles').update({
          email: session.user.email
        }).eq('id', session.user.id)
        await loadUserData()
        toast.success('Email updated successfully!')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const uploadAvatar = async (file) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return

    const filePath = `${user.id}/avatar.png`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) { console.error("Upload error:", uploadError); return }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

    await supabase.from('profiles').upsert({
      id: user.id,
      avatar_url: urlData.publicUrl,
      name,
      bio,
    })

    await loadUserData()
  }

  const handleRemoveImage = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return

    const filePath = `${user.id}/avatar.png`
    await supabase.storage.from('avatars').remove([filePath])

    const { error } = await supabase.from('profiles').upsert({ id: user.id, avatar_url: null })
    if (error) { toast.error("Failed to remove image."); return }

    setImage(false)
    await loadUserData()
    toast.success("Profile image removed.")
  }

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) { toast.error("Please enter a new email."); return }
    setChangingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      toast.success("Confirmation link sent to your new email. Click it to complete the change.")
      setNewEmail("")
    } catch (err) {
      toast.error(err.message || "Failed to update email.")
    } finally {
      setChangingEmail(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      toast.error("Please fill in both password fields.")
      return
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.")
      return
    }
    setChangingPassword(true)
    try {
      // ✅ verify current password first by re-signing in
      const { data: authData } = await supabase.auth.getUser()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authData.user.email,
        password: currentPassword
      })
      if (signInError) {
        toast.error("Current password is incorrect.")
        return
      }

      // ✅ update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
    } catch (err) {
      toast.error(err.message || "Failed to change password.")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name,
      bio,
      phone,
    })

    if (error) { toast.error("Failed to save profile!"); return }

    await loadUserData()
    toast.success("Profile saved! Enjoy your chatting.")
    setTimeout(() => navigate('/chat'), 1500)
  }

  const currentAvatar = image
    ? URL.createObjectURL(image)
    : userData?.avatar_url || assets.avatar_icon

  return (
    <div className='profile'>
      <div className="profile-container">

        {/* ✅ Back to chat button */}
        <button
          type="button"
          onClick={() => navigate('/chat')}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#df1637',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ← Back to Chat
        </button>

        <form onSubmit={handleSubmit}>
          <h3>Profile Details</h3>

          <label htmlFor="avatar" style={{ cursor: 'pointer' }}>
            <input
              type="file"
              id="avatar"
              accept=".png, .jpg, .jpeg"
              hidden
              onChange={async (e) => {
                const file = e.target.files[0]
                if (!file) return
                setImage(file)
                await uploadAvatar(file)
              }}
            />
            <img src={currentAvatar} alt="" />
            Upload Profile Image
          </label>

          {(image || userData?.avatar_url) && (
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                marginTop: '4px',
                background: 'none',
                border: '1px solid #ff4d4d',
                color: '#ff4d4d',
                borderRadius: '6px',
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ✕ Remove Image
            </button>
          )}

          <input
            type="text"
            placeholder='Your name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <textarea
            placeholder='Write profile bio'
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            required
          />

          <input
            type="tel"
            placeholder='Phone number (for recovery)'
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* ✅ Change Email section */}
          <div className="change-email-section">
            <p className="section-label">Change Email</p>
            <div className="email-row">
              <input
                type="email"
                placeholder='Enter new email address'
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <button
                type="button"
                onClick={handleChangeEmail}
                disabled={changingEmail}
                className="email-change-btn"
              >
                {changingEmail ? 'Sent...' : 'Update'}
              </button>
            </div>
            <small className="email-note">
              A confirmation link will be sent to your new email. Click it to complete the change. After confirming, use your new email to log in.
            </small>
          </div>

          {/* ✅ Change Password section */}
          <div className="change-email-section">
            <p className="section-label">Change Password</p>
            <div className="email-row">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="email-row" style={{ marginTop: '8px' }}>
              <input
                type="password"
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="email-change-btn"
              >
                {changingPassword ? 'Saving...' : 'Update'}
              </button>
            </div>
            <small className="email-note">
              Enter your current password and a new password to update it.
            </small>
          </div>

          <button type='submit'>Save</button>
        </form>

        <img className='profile-pic' src={currentAvatar} alt="" />
      </div>
    </div>
  )
}

export default ProfileUpdate