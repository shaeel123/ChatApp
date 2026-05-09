import React, { useEffect, useState, useRef, useCallback } from 'react'
import './MiddleBox.css'
import assets from '../../assets/assets'
import { supabase } from '../../config/supabase'
import { useAppContext } from '../../context/AppContext'
import EmojiPicker from 'emoji-picker-react'
import ReactDOM from 'react-dom'

const DEFAULT_AVATAR = assets.avatar_icon

const DEFAULT_WALLPAPERS = [
  { id: 'default', label: 'Default', bg: '#f1f5ff', bubbleSent: '#077eff', bubbleReceived: '#e4e6eb', inputBar: 'white', textSent: 'white', textReceived: 'black' },
  { id: 'instagram', label: 'Instagram', bg: 'linear-gradient(180deg, #833ab4, #fd1d1d, #fcb045)', bubbleSent: 'linear-gradient(90deg, #833ab4, #fd1d1d)', bubbleReceived: 'rgba(255,255,255,0.25)', inputBar: 'rgba(255,255,255,0.15)', textSent: 'white', textReceived: 'white' },
  { id: 'midnight', label: 'Midnight', bg: 'linear-gradient(180deg, #0f0c29, #302b63, #24243e)', bubbleSent: '#6c63ff', bubbleReceived: 'rgba(255,255,255,0.15)', inputBar: '#1a1a2e', textSent: 'white', textReceived: 'white' },
  { id: 'ocean', label: 'Ocean', bg: 'linear-gradient(180deg, #2193b0, #6dd5ed)', bubbleSent: '#005f73', bubbleReceived: 'rgba(255,255,255,0.3)', inputBar: '#2193b0', textSent: 'white', textReceived: 'white' },
  { id: 'sunset', label: 'Sunset', bg: 'linear-gradient(180deg, #f7797d, #FBD786, #C6FFDD)', bubbleSent: '#f7797d', bubbleReceived: 'rgba(255,255,255,0.35)', inputBar: '#f9a8a8', textSent: 'white', textReceived: '#333' },
  { id: 'forest', label: 'Forest', bg: 'linear-gradient(180deg, #134e5e, #71b280)', bubbleSent: '#134e5e', bubbleReceived: 'rgba(255,255,255,0.25)', inputBar: '#1a5c45', textSent: 'white', textReceived: 'white' },
  { id: 'candy', label: 'Candy', bg: 'linear-gradient(180deg, #fc5c7d, #6a3093)', bubbleSent: '#6a3093', bubbleReceived: 'rgba(255,255,255,0.25)', inputBar: '#fc5c7d', textSent: 'white', textReceived: 'white' },
  { id: 'gold', label: 'Gold', bg: 'linear-gradient(180deg, #f7971e, #ffd200)', bubbleSent: '#c47d00', bubbleReceived: 'rgba(255,255,255,0.35)', inputBar: '#f7971e', textSent: 'white', textReceived: '#333' },
  { id: 'rose', label: 'Rose', bg: 'linear-gradient(180deg, #f953c6, #b91d73)', bubbleSent: '#b91d73', bubbleReceived: 'rgba(255,255,255,0.25)', inputBar: '#f953c6', textSent: 'white', textReceived: 'white' },
  { id: 'space', label: 'Space', bg: 'linear-gradient(180deg, #000000, #434343)', bubbleSent: '#434343', bubbleReceived: 'rgba(255,255,255,0.12)', inputBar: '#111', textSent: 'white', textReceived: 'white' },
]

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_KEY

const MiddleBox = () => {
  const { userData, chatUser, setChatUser } = useAppContext()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [currentUserId, setCurrentUserId] = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [previewVideo, setPreviewVideo] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false)
  const [wallpaper, setWallpaper] = useState(DEFAULT_WALLPAPERS[0])
  const [tappedMsgId, setTappedMsgId] = useState(null)
  const [stagedFile, setStagedFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const messagesEndRef = useRef(null)
  const chatMsgRef = useRef(null)
  const userRef = useRef(null)
  const chatUserRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const longPressTimer = useRef(null)
  const scrollTimer = useRef(null)

  useEffect(() => { chatUserRef.current = chatUser }, [chatUser])

  useEffect(() => {
    if (!chatUser) return
    try {
      const saved = localStorage.getItem(`theme_${chatUser.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        const match = DEFAULT_WALLPAPERS.find(w => w.id === parsed.id)
        setWallpaper(match || parsed)
      } else {
        setWallpaper(DEFAULT_WALLPAPERS[0])
      }
    } catch {
      setWallpaper(DEFAULT_WALLPAPERS[0])
    }
  }, [chatUser])

  // ✅ Set user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        userRef.current = data.user
        setCurrentUserId(data.user.id)
      }
    })
  }, [])

  // ✅ Always get a fresh token — never use stale cache
  const getFreshToken = async () => {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.access_token) return data.session.access_token
    // Fallback: force refresh
    const { data: refreshed } = await supabase.auth.refreshSession()
    return refreshed?.session?.access_token || null
  }

  const getCurrentUser = async () => {
    if (userRef.current) return userRef.current
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      userRef.current = data.user
      setCurrentUserId(data.user.id)
    }
    return data?.user || null
  }

  const fetchMessages = async (myId, otherId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(user_id.eq.${myId},receiver_id.eq.${otherId}),and(user_id.eq.${otherId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true })
    if (!error) setMessages(data)
  }

  useEffect(() => {
    let channel
    const setup = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      userRef.current = data.user
      setCurrentUserId(data.user.id)
      if (!chatUser) return
      await fetchMessages(data.user.id, chatUser.id)
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('receiver_id', data.user.id)
        .eq('user_id', chatUser.id)
        .eq('is_read', false)
      channel = supabase
        .channel(`chat-${data.user.id}-${chatUser.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const msg = payload.new
            const cu = userRef.current
            const chat = chatUserRef.current
            if (!cu || !chat) return
            if (
              (msg.user_id === cu.id && msg.receiver_id === chat.id) ||
              (msg.user_id === chat.id && msg.receiver_id === cu.id)
            ) {
              setMessages(prev => {
                if (prev.find(m => m.id === msg.id)) return prev
                return [...prev, { ...msg, created_at: msg.created_at || new Date().toISOString() }]
              })
            }
          }
        )
        .subscribe()
    }
    setup()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [chatUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Debounced scroll handler — avoids setState on every scroll frame
  const handleScroll = useCallback(() => {
    if (scrollTimer.current) return
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null
      const el = chatMsgRef.current
      if (!el) return
      setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120)
    }, 100)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const resetFileInputs = () => {
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  // ✅ sendMessage: fresh token every time, add to state directly
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !chatUser) return
    const cu = await getCurrentUser()
    if (!cu) return
    const token = await getFreshToken()
    if (!token) return

    setInput('')
    setShowEmoji(false)

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          content: text,
          user_id: cu.id,
          receiver_id: chatUser.id,
          username: cu.email,
          avatar_url: userData?.avatar_url || null
        })
      })
      const result = await res.json()
      if (Array.isArray(result) && result[0]) {
        setMessages(prev => {
          if (prev.find(m => m.id === result[0].id)) return prev
          return [...prev, result[0]]
        })
      }
    } catch (err) {
      console.error('Send error:', err)
    }
  }

  const handleFileSelect = async (file, type) => {
    if (!file) return
    if (type === 'video' && file.size > 100 * 1024 * 1024) {
      alert('Video is too large. Please upload a video under 100MB.')
      return
    }
    // Revoke old preview URL
    if (stagedFile?.previewUrl) URL.revokeObjectURL(stagedFile.previewUrl)
    const previewUrl = URL.createObjectURL(file)
    setStagedFile({ file, type, previewUrl })
  }

  // ✅ sendStagedFile: gets fresh token right before upload
  const sendStagedFile = async () => {
    if (!stagedFile || !chatUser) return
    const cu = await getCurrentUser()
    if (!cu) return

    setUploading(true)
    const { file, type, previewUrl } = stagedFile

    // Get fresh token immediately before upload
    const token = await getFreshToken()
    if (!token) {
      console.error('No auth token')
      setUploading(false)
      return
    }

    const ext = file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg')
    const filePath = `${cu.id}/messages/${Date.now()}.${ext}`
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/avatars/${filePath}`

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
          'x-upsert': 'true'
        },
        body: file
      })
      if (!uploadRes.ok) {
        const errText = await uploadRes.text()
        console.error('Upload failed:', errText)
        setUploading(false)
        return
      }
    } catch (err) {
      console.error('Upload error:', err)
      setUploading(false)
      return
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          content: '',
          user_id: cu.id,
          receiver_id: chatUser.id,
          username: cu.email,
          avatar_url: userData?.avatar_url || null,
          ...(type === 'image' ? { image_url: publicUrl } : { video_url: publicUrl })
        })
      })
      const result = await res.json()
      if (Array.isArray(result) && result[0]) {
        setMessages(prev => {
          if (prev.find(m => m.id === result[0].id)) return prev
          return [...prev, result[0]]
        })
      }
    } catch (err) {
      console.error('Insert error:', err)
    }

    URL.revokeObjectURL(previewUrl)
    setStagedFile(null)
    resetFileInputs()
    setUploading(false)
  }

  const cancelStagedFile = () => {
    if (stagedFile?.previewUrl) URL.revokeObjectURL(stagedFile.previewUrl)
    setStagedFile(null)
    resetFileInputs()
  }

  const deleteMessage = async (msgId) => {
    const token = await getFreshToken()
    if (!token) return
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${msgId}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    })
    if (!res.ok) { console.error('Delete failed:', await res.text()); return }
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setTappedMsgId(null)
  }

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text)
    setTappedMsgId(null)
  }

  // ✅ Long press for mobile delete (500ms hold)
  const handleTouchStart = (msgId) => {
    longPressTimer.current = setTimeout(() => {
      setTappedMsgId(prev => prev === msgId ? null : msgId)
    }, 500)
  }

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer.current)
  }

  // ✅ Single tap toggles context menu on mobile
  const handleBubbleTap = (msgId) => {
    setTappedMsgId(prev => prev === msgId ? null : msgId)
  }

  const handleWallpaperUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const custom = {
      id: 'custom', type: 'image', value: url,
      bubbleSent: '#077eff', bubbleReceived: 'rgba(255,255,255,0.85)',
      inputBar: 'rgba(255,255,255,0.9)', textSent: 'white', textReceived: 'black',
    }
    setWallpaper(custom)
    localStorage.setItem(`theme_${chatUser.id}`, JSON.stringify(custom))
    setShowWallpaperPicker(false)
  }

  const getChatMsgStyle = () => {
    if (wallpaper.type === 'image') {
      return { backgroundImage: `url(${wallpaper.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    }
    return { background: wallpaper.bg }
  }

  const onEmojiClick = (emojiData) => {
    setInput(prev => prev + emojiData.emoji)
  }

  if (!chatUser) {
    return (
      <div className='chat-box chat-welcome'>
        <video className="welcome-video" src="/Chatapp-video.mp4" autoPlay loop playsInline muted={muted} />
        <button className="unmute-btn" onClick={() => setMuted(prev => !prev)}>
          {muted ? '🔇 Click to unmute' : '🔊 Mute'}
        </button>
      </div>
    )
  }

  return (
    <div className='chat-box' onClick={() => { if (tappedMsgId) setTappedMsgId(null) }}>
      <div className="chat-user">
        <img
          src={chatUser?.avatar_url || DEFAULT_AVATAR}
          alt=""
          className="clickable-avatar"
          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
          onClick={(e) => { e.stopPropagation(); setPreviewImg(chatUser?.avatar_url || DEFAULT_AVATAR) }}
        />
        <p>
          {chatUser?.name?.trim() || 'Unknown User'}
          {chatUser?.is_online && <img className='dot' src={assets.green_dot} alt="" />}
        </p>

        <div className="wallpaper-btn-wrapper">
          <span className="wallpaper-btn" onClick={(e) => { e.stopPropagation(); setShowWallpaperPicker(prev => !prev) }}>🎨</span>
          {showWallpaperPicker && (
            <div className="wallpaper-picker" onClick={e => e.stopPropagation()}>
              <p className="wallpaper-picker-title">Choose Theme</p>
              <div className="wallpaper-grid">
                {DEFAULT_WALLPAPERS.map((w) => (
                  <div
                    key={w.id}
                    className={`wallpaper-swatch ${wallpaper.id === w.id ? 'active' : ''}`}
                    style={{ background: w.bg }}
                    onClick={() => {
                      setWallpaper(w)
                      localStorage.setItem(`theme_${chatUser.id}`, JSON.stringify(w))
                      setShowWallpaperPicker(false)
                    }}
                  >
                    <span>{w.label}</span>
                  </div>
                ))}
              </div>
              <label className="wallpaper-upload-btn">
                📁 Upload Photo
                <input type="file" accept="image/*" hidden onChange={handleWallpaperUpload} />
              </label>
            </div>
          )}
        </div>

        <div className="back-btn-wrapper" onClick={() => setChatUser(null)}>
          <span className="back-btn">&#8592;</span>
          <span className="back-tooltip">Go back</span>
        </div>
      </div>

      <div className="chat-msg" ref={chatMsgRef} onScroll={handleScroll} style={getChatMsgStyle()}>
        {messages.map((msg) => {
          const isMe = msg.user_id === currentUserId
          const isActive = tappedMsgId === msg.id

          return (
            <div key={msg.id} className={isMe ? 'r-msg' : 's-msg'}>
              <div className="msg-wrapper">

                {msg.image_url ? (
                  <div
                    style={{ position: 'relative', display: 'inline-block' }}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onMouseEnter={() => setTappedMsgId(msg.id)}
                    onMouseLeave={() => setTappedMsgId(null)}
                    onClick={e => e.stopPropagation()}
                  >
                    <img
                      src={msg.image_url}
                      alt="shared"
                      className="chat-image"
                      onClick={() => setPreviewImg(msg.image_url)}
                    />
                    {isActive && isMe && (
                      <div className="msg-context-menu menu-left">
                        <button onClick={() => deleteMessage(msg.id)}>🗑 Delete</button>
                      </div>
                    )}
                  </div>

                ) : msg.video_url ? (
                  <div
                    style={{ position: 'relative', display: 'inline-block' }}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onMouseEnter={() => setTappedMsgId(msg.id)}
                    onMouseLeave={() => setTappedMsgId(null)}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="chat-video-wrapper">
                      <video
                        src={msg.video_url}
                        className="chat-video"
                        controls
                        playsInline
                        preload="metadata"
                        onClick={e => e.stopPropagation()}
                      />
                      <button className="video-fullscreen-btn" onClick={() => setPreviewVideo(msg.video_url)}>⛶</button>
                    </div>
                    {isActive && isMe && (
                      <div className="msg-context-menu menu-left">
                        <button onClick={() => deleteMessage(msg.id)}>🗑 Delete</button>
                      </div>
                    )}
                  </div>

                ) : (
                  <div
                    style={{ position: 'relative', display: 'inline-block' }}
                    onTouchStart={() => handleTouchStart(msg.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    onMouseEnter={() => setTappedMsgId(msg.id)}
                    onMouseLeave={() => setTappedMsgId(null)}
                    onClick={e => { e.stopPropagation(); handleBubbleTap(msg.id) }}
                  >
                    <p className="msg" style={{
                      background: isMe ? wallpaper.bubbleSent : wallpaper.bubbleReceived,
                      color: isMe ? wallpaper.textSent : wallpaper.textReceived,
                    }}>
                      {msg.content}
                    </p>
                    {isActive && (
                      <div className={`msg-context-menu ${isMe ? 'menu-left' : 'menu-right'}`}>
                        <button onClick={() => copyMessage(msg.content)}>📋 Copy</button>
                        {isMe && <button onClick={() => deleteMessage(msg.id)}>🗑 Delete</button>}
                      </div>
                    )}
                  </div>
                )}

                <div className="msg-info">
                  <img
                    src={msg.avatar_url || DEFAULT_AVATAR}
                    alt=""
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
                  />
                  <p style={{ color: wallpaper.id === 'default' ? 'gray' : 'rgba(255,255,255,0.8)' }}>
                    {new Date(msg.created_at + 'Z').toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
                    })}
                  </p>
                </div>

              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {showScrollBtn && (
        <button className="scroll-down-btn" onClick={scrollToBottom}>↓</button>
      )}

      {stagedFile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', background: '#f0f0f0', borderTop: '1px solid #ddd',
          flexShrink: 0
        }}>
          {stagedFile.type === 'image'
            ? <img src={stagedFile.previewUrl} alt="preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} />
            : <video src={stagedFile.previewUrl} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} muted playsInline />
          }
          <span style={{ flex: 1, fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stagedFile.file.name}
          </span>
          <button
            onClick={sendStagedFile}
            disabled={uploading}
            style={{ background: '#077eff', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}
          >
            {uploading ? '⏳' : '📤 Send'}
          </button>
          <button
            onClick={cancelStagedFile}
            disabled={uploading}
            style={{ background: '#eee', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="chat-input" style={{ background: wallpaper.inputBar }} onClick={e => e.stopPropagation()}>
        {showEmoji && (
          <div className="emoji-picker">
            <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} />
          </div>
        )}

        <input
          id="chat-message"
          name="message"
          type="text"
          placeholder="Send a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
          onClick={e => e.stopPropagation()}
          style={{ background: 'transparent', color: wallpaper.id === 'default' ? '#333' : wallpaper.textReceived }}
        />

        <span className="emoji-btn" onClick={() => setShowEmoji(prev => !prev)}>😊</span>

        <input
          ref={imageInputRef}
          type="file"
          id="image"
          accept="image/*"
          hidden
          onChange={(e) => handleFileSelect(e.target.files[0], 'image')}
        />
        <label htmlFor="image">
          <img src={assets.gallery_icon} alt="" className="gallery-btn" />
        </label>

        <input
          ref={videoInputRef}
          type="file"
          id="video-upload"
          accept="video/*"
          hidden
          onChange={(e) => handleFileSelect(e.target.files[0], 'video')}
        />
        <label htmlFor="video-upload" style={{ cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>
          🎥
        </label>

        <img src={assets.send_button} alt="" onClick={sendMessage} />
      </div>

      {previewImg && ReactDOM.createPortal(
        <div className="img-preview-overlay" onClick={() => setPreviewImg(null)}>
          <div className="img-preview-box" onClick={e => e.stopPropagation()}>
            <img src={previewImg} alt="preview" />
            <button className="img-preview-close" onClick={() => setPreviewImg(null)}>✕</button>
          </div>
        </div>,
        document.body
      )}

      {previewVideo && ReactDOM.createPortal(
        <div className="img-preview-overlay" onClick={() => setPreviewVideo(null)}>
          <div className="img-preview-box video-preview-box" onClick={e => e.stopPropagation()}>
            <video src={previewVideo} controls autoPlay playsInline style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '10px' }} />
            <button className="img-preview-close" onClick={() => setPreviewVideo(null)}>✕</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default MiddleBox