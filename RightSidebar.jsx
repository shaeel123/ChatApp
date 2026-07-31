import React, { useEffect, useState } from 'react'
import './RightSidebar.css'
import assets from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import ReactDOM from 'react-dom'

const DEFAULT_AVATAR = assets.avatar_icon

const RightSidebar = () => {
  const navigate = useNavigate()
{/* 1 */}
  const { userData, chatUser, setChatUser, setUserData,  showProfile, setShowProfile} = useAppContext()     
  const [media, setMedia] = useState([])
  const [previewImg, setPreviewImg] = useState(null)
  const [previewVideo, setPreviewVideo] = useState(null)

  const fetchMedia = async () => {
    // ✅ Get this user's clear timestamp for this conversation
    let clearedAt = null
    try {
      const { data: clearData } = await supabase
        .from('chat_clears')
        .select('cleared_at')
        .eq('user_id', userData.id)
        .eq('other_user_id', chatUser.id)
        .maybeSingle()
      clearedAt = clearData?.cleared_at || null
    } catch (_) {}

    const { data, error } = await supabase
      .from('messages')
      .select('image_url, video_url, created_at')
      .or(
        `and(user_id.eq.${userData.id},receiver_id.eq.${chatUser.id}),and(user_id.eq.${chatUser.id},receiver_id.eq.${userData.id})`
      )
      .or('image_url.not.is.null,video_url.not.is.null')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const filtered = data.filter(d => d.image_url || d.video_url)
      // ✅ Respect chat_clears — hide media before cleared_at
      const visible = clearedAt
        ? filtered.filter(d => new Date(d.created_at + 'Z') > new Date(clearedAt))
        : filtered
      setMedia(visible)
    }
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
          const isRelevant =
            (msg.user_id === userData.id && msg.receiver_id === chatUser.id) ||
            (msg.user_id === chatUser.id && msg.receiver_id === userData.id)

          if (isRelevant && (msg.image_url || msg.video_url)) {
            setMedia((prev) => [{
              image_url: msg.image_url || null,
              video_url: msg.video_url || null,
              created_at: msg.created_at || new Date().toISOString(),
            }, ...prev])
          }
        }
      )
      // ✅ Also listen to chat_clears so media panel updates instantly after clear
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_clears' },
        () => fetchMedia()
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [chatUser])

  return (
    <div className='rs'>
      {chatUser ? (
        <>
         {/* ── Mobile-only back button ── */}         {/*2*/}
        <div className="mobile-rs-back" onClick={() => setShowProfile(false)}>← Back</div>
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
                media.map((item, index) => {
                  if (item.image_url) {
                    return (
                      <img
                        key={index}
                        src={item.image_url}
                        alt=""
                        className="rs-media-img"
                        onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
                        onClick={() => setPreviewImg(item.image_url)}
                      />
                    )
                  }

                  if (item.video_url) {
                    return (
                      <div
                        key={index}
                        className="rs-media-video-thumb"
                        onClick={() => setPreviewVideo(item.video_url)}
                        title="Play video"
                      >
                        <video
                          src={item.video_url}
                          className="rs-media-img"
                          preload="metadata"
                          muted
                          style={{ pointerEvents: 'none' }}
                        />
                        <div className="rs-video-play-icon">▶</div>
                      </div>
                    )
                  }

                  return null
                })
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

      {previewVideo && ReactDOM.createPortal(
        <div className="img-preview-overlay" onClick={() => setPreviewVideo(null)}>
          <div className="img-preview-box video-preview-box" onClick={(e) => e.stopPropagation()}>
            <video
              src={previewVideo}
              controls
              autoPlay
              style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '10px' }}
            />
            <button className="img-preview-close" onClick={() => setPreviewVideo(null)}>✕</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default RightSidebar