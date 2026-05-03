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
  const navigate = useNavigate()
  const { loadUserData, userData } = useAppContext()

  useEffect(() => {
    if (userData) {
      setName(userData.name || "")
      setBio(userData.bio || "")
    }
  }, [userData])

  const uploadAvatar = async (file) => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return

    const filePath = `${user.id}/avatar.png`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    await supabase.from('profiles').upsert({
      id: user.id,
      avatar_url: urlData.publicUrl,
      name,
      bio,
    })

    await loadUserData()
  }

  // ✅ Remove profile image
  const handleRemoveImage = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) return

    // Delete from storage
    const filePath = `${user.id}/avatar.png`
    await supabase.storage.from('avatars').remove([filePath])

    // Set avatar_url to null in DB
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      avatar_url: null,
    })

    if (error) {
      toast.error("Failed to remove image.")
      return
    }

    setImage(false)
    await loadUserData()
    toast.success("Profile image removed.")
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
    })

    if (error) {
      toast.error("Failed to save profile!")
      return
    }

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

          {/* ✅ Remove button — only shows when avatar exists */}
          {(image || userData?.avatar_url) && (
            <button
              type="button"
              onClick={handleRemoveImage}
              style={{
                marginTop: '8px',
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

          <button type='submit'>Save</button>
        </form>

        <img
          className='profile-pic'
          src={currentAvatar}
          alt=""
        />
      </div>
    </div>
  )
}

export default ProfileUpdate