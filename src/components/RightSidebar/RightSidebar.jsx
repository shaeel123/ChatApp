import React, { useEffect, useState } from 'react'
import './RightSidebar.css'
import assets from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import ReactDOM from 'react-dom'

const DEFAULT_AVATAR = assets.avatar_icon // ✅ correct — avatar_icon exists, profile_icon does not

const RightSidebar = () => {
  const navigate = useNavigate()
  const { userData, chatUser, setChatUser, setUserData } = useAppContext()
  const [media, setMedia] = useState([])
  const [previewImg, setPreviewImg] = useState(null)

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('image_url, created_at')
      .not('image_url', 'is', null)
      .or(
        `and(user_id.eq.${userData.id},receiver_id.eq.${chatUser.id}),and(user_id.eq.${chatUser.id},receiver_id.eq.${userData.id})`
      )
      .order('created_at', { ascending: false })

    if (!error && data) setMedia(data)
  }

  const handleLogout = async () => {
    localStorage.clear()
    await supabase.auth.signOut()
    setChatUser(null)
    setUserData(null)
    navigate('/', { replace: true })
  }

  useEffect(() => {
    if (!chatUser || !userData) return

    fetchMedia()

    const channel = supabase
      .channel(`media-${userData.id}-${chatUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new
          if (
            msg.image_url &&
            (
              (msg.user_id === userData.id && msg.receiver_id === chatUser.id) ||
              (msg.user_id === chatUser.id && msg.receiver_id === userData.id)
            )
          ) {
            setMedia((prev) => [{ image_url: msg.image_url }, ...prev])
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [chatUser])

  return (
    <div className='rs'>
      {chatUser ? (
        <>
          <div className="rs-profile">
            <img
              src={chatUser.avatar_url || DEFAULT_AVATAR}
              alt=""
              className="clickable-avatar"
              onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
              onClick={() => setPreviewImg(chatUser.avatar_url || DEFAULT_AVATAR)}
            />
            <h3>
              {chatUser.name?.trim() || "Unknown User"}
              {chatUser?.is_online && (
                <img src={assets.green_dot} className='dot' alt="" />
              )}
            </h3>
            <p>{chatUser.bio?.trim() || ""}</p>
          </div>
          <hr />
          <div className="rs-media">
            <p>Media</p>
            <div>
              {media.length > 0 ? (
                media.map((item, index) => (
                  <img
                    key={index}
                    src={item.image_url}
                    alt=""
                    className="rs-media-img"
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
                    onClick={() => setPreviewImg(item.image_url)}
                  />
                ))
              ) : (
                <p className="rs-no-media">No media shared yet</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rs-empty">
          <p>Select a user to view profile</p>
        </div>
      )}

      <button onClick={handleLogout}>Logout</button>

      {previewImg && ReactDOM.createPortal(
        <div className="img-preview-overlay" onClick={() => setPreviewImg(null)}>
          <div className="img-preview-box" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg} alt="preview" />
            <button className="img-preview-close" onClick={() => setPreviewImg(null)}>✕</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default RightSidebar