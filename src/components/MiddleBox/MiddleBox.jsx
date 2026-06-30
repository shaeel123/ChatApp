import React, { useEffect, useState, useRef } from 'react'
import './MiddleBox.css'
import assets from '../../assets/assets'
import { supabase } from '../../config/supabase'
import { useAppContext } from '../../context/AppContext'
// TEMP DEBUG: import EmojiPicker from 'emoji-picker-react'
import ReactDOM from 'react-dom'
import VideoCall from '../VideoCall/VideoCall'

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
  const [user, setUser] = useState(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [previewVideo, setPreviewVideo] = useState(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false)
  const [wallpaper, setWallpaper] = useState(DEFAULT_WALLPAPERS[0])
  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [stagedFile, setStagedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  // ── Video call ──────────────────────────────────────
  const [showVideoCall, setShowVideoCall] = useState(false)

  const messagesEndRef = useRef(null)
  const chatMsgRef = useRef(null)
  const hoverTimer = useRef(null)
  const userRef = useRef(null)
  const chatUserRef = useRef(null)
  const tokenRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const emojiBtnRef = useRef(null)
  const messageInputRef = useRef(null)

  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { chatUserRef.current = chatUser }, [chatUser])

  // Close emoji picker when clicking anywhere outside it
  useEffect(() => {
    if (!showEmoji) return
    const handleClickOutside = (e) => {
      const clickedPicker = emojiPickerRef.current && emojiPickerRef.current.contains(e.target)
      const clickedBtn    = emojiBtnRef.current && emojiBtnRef.current.contains(e.target)
      if (!clickedPicker && !clickedBtn) {
        setShowEmoji(false)
      }
    }
    // Bubble phase, mouseup — does not interfere with React's synthetic click/keydown handling
    document.addEventListener('mouseup', handleClickOutside)
    return () => {
      document.removeEventListener('mouseup', handleClickOutside)
    }
  }, [showEmoji])

  // Reliable Enter-to-send: listens at document capture level so nothing can block it
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        setCurrentUserId(data.user.id)
        userRef.current = data.user
      }
    })
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data?.session?.access_token || null
    })
  }, [])

  const onEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji)
  }

 const fetchMessages = async (myId, otherId) => {
  let clearedAt = null
  try {
    const { data: clearData } = await supabase
      .from('chat_clears')
      .select('cleared_at')
      .eq('user_id', myId)
      .eq('other_user_id', otherId)
      .maybeSingle()
    clearedAt = clearData?.cleared_at || null
  } catch (_) {
    clearedAt = null
  }

  console.log('fetchMessages — myId:', myId, 'otherId:', otherId, 'clearedAt:', clearedAt)

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(user_id.eq.${myId},receiver_id.eq.${otherId}),and(user_id.eq.${otherId},receiver_id.eq.${myId})`)
    .order('created_at', { ascending: true })

  if (!error && data) {
    const filtered = clearedAt
      ? data.filter(m => new Date(m.created_at + 'Z') > new Date(clearedAt))
      : data
    setMessages(filtered)
  }
}

  const getCurrentUser = async () => {
    if (userRef.current) return userRef.current
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      setUser(data.user)
      userRef.current = data.user
      setCurrentUserId(data.user.id)
    }
    return data?.user || null
  }

  useEffect(() => {
    let channel
    const setup = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      setUser(data.user)
      setCurrentUserId(data.user.id)
      userRef.current = data.user
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
              setMessages((prev) => {
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

  const handleScroll = () => {
    const el = chatMsgRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollBtn(distanceFromBottom > 100)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const resetFileInputs = () => {
    if (imageInputRef.current) imageInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const sendMessage = async () => {
    console.log('[DEBUG] sendMessage called. input:', JSON.stringify(input), 'chatUser:', chatUser?.id)
    if (!input.trim() || !chatUser) {
      console.log('[DEBUG] sendMessage early-returned. input.trim():', input.trim(), 'chatUser exists:', !!chatUser)
      return
    }
    const cu = await getCurrentUser()
    console.log('[DEBUG] getCurrentUser resolved:', cu?.id)
    if (!cu) {
      console.log('[DEBUG] sendMessage early-returned: no current user')
      return
    }
    const { error } = await supabase.from('messages').insert([{
      content: input,
      user_id: cu.id,
      receiver_id: chatUser.id,
      username: cu.email,
      avatar_url: userData?.avatar_url
    }])
    if (error) { console.error('[DEBUG] insert error:', error); return }
    console.log('[DEBUG] message inserted successfully')
    setInput('')
    setShowEmoji(false)
  }

  const handleFileSelect = async (file, type) => {
    if (!file) return
    if (type === 'video' && file.size > 50 * 1024 * 1024) {
      alert('Video is too large. Please upload a video under 50MB.')
      return
    }
    if (stagedFile?.previewUrl) URL.revokeObjectURL(stagedFile.previewUrl)
    const { data: sessionData } = await supabase.auth.getSession()
    tokenRef.current = sessionData?.session?.access_token || null
    const previewUrl = URL.createObjectURL(file)
    setStagedFile({ file, type, previewUrl })
  }

  const sendStagedFile = async () => {
    if (!stagedFile || !chatUser) return
    const cu = await getCurrentUser()
    if (!cu) return

    setUploading(true)
    const { file, type, previewUrl } = stagedFile

    const { data: freshSession } = await supabase.auth.getSession()
    const token = freshSession?.session?.access_token || tokenRef.current
    tokenRef.current = token
    if (!token) { setUploading(false); return }

    const filePath = `${cu.id}/messages/${Date.now()}_${file.name}`
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/avatars/${filePath}`

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': file.type,
          'x-upsert': 'false'
        },
        body: file
      })
      if (!uploadRes.ok) {
        console.error('Upload failed:', await uploadRes.text())
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
        setMessages((prev) => {
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
    const token = tokenRef.current
    if (!token) return
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${msgId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      }
    })
    if (!res.ok) { console.error('Delete failed:', await res.text()); return }
    setMessages((prev) => prev.filter(m => m.id !== msgId))
    setHoveredMsgId(null)
  }

const clearChat = async () => {
  const cu = await getCurrentUser()
  if (!cu || !chatUser) return
  setClearing(true)

  let clearedAt = null
  try {
    const { data: existing } = await supabase
      .from('chat_clears')
      .select('cleared_at')
      .eq('user_id', cu.id)
      .eq('other_user_id', chatUser.id)
      .maybeSingle()
    clearedAt = existing?.cleared_at || null
  } catch (_) {}

  const { data: myMsgs } = await supabase
    .from('messages')
    .select('id, image_url, video_url, created_at')
    .eq('user_id', cu.id)
    .eq('receiver_id', chatUser.id)

  const visibleMyMsgs = clearedAt
    ? (myMsgs || []).filter(m => new Date(m.created_at + 'Z') > new Date(clearedAt))
    : (myMsgs || [])

  const myFilePaths = visibleMyMsgs
    .map(m => {
      const url = m.image_url || m.video_url
      if (!url) return null
      const match = url.match(/\/public\/avatars\/(.+)/)
      return match ? match[1] : null
    })
    .filter(Boolean)

  if (myFilePaths.length > 0) {
    const { error: storageErr } = await supabase.storage
      .from('avatars')
      .remove(myFilePaths)
    if (storageErr) console.error('Storage delete error:', storageErr)
    else console.log('✅ Deleted media files:', myFilePaths.length)
  }

  const { error } = await supabase
    .from('chat_clears')
    .upsert({
      user_id: cu.id,
      other_user_id: chatUser.id,
      cleared_at: new Date().toISOString()
    }, { onConflict: 'user_id,other_user_id' })

  if (!error) {
    setMessages([])
  } else {
    console.error('Clear failed:', error)
  }

  setClearing(false)
  setShowClearConfirm(false)
}

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text)
    setHoveredMsgId(null)
  }

  const handleBubbleEnter = (msgId) => {
    clearTimeout(hoverTimer.current)
    setHoveredMsgId(msgId)
  }

  const handleBubbleLeave = () => {
    hoverTimer.current = setTimeout(() => setHoveredMsgId(null), 800)
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

  if (!chatUser) {
    return (
      <div className='chat-box chat-welcome'>
        <video className="welcome-video" src="/BLueC_desktop_app_promo_202606101237.mp4" autoPlay loop playsInline muted={muted} />
        <button className="unmute-btn" onClick={() => setMuted((prev) => !prev)}>
          {muted ? '🔇 Click to unmute' : '🔊 Mute'}
        </button>
      </div>
    )
  }

  return (
    <div className='chat-box'>
      <div className="chat-user">
        <img
          src={chatUser?.avatar_url || DEFAULT_AVATAR}
          alt=""
          className="clickable-avatar"
          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
          onClick={() => setPreviewImg(chatUser?.avatar_url || DEFAULT_AVATAR)}
        />
        <p>
          {chatUser?.name?.trim() || "Unknown User"}
          {chatUser?.is_online && <img className='dot' src={assets.green_dot} alt="" />}
        </p>

        {/* ── Video call button ── */}
        <span
          title="Video call"
          onClick={() => setShowVideoCall(true)}
          style={{ cursor: 'pointer', fontSize: '20px', marginRight: '4px' }}
        >
          📹
        </span>

        <span
          title="Clear my messages"
          onClick={() => setShowClearConfirm(true)}
          style={{ cursor: 'pointer', fontSize: '18px', marginRight: '4px' }}
        >
          🗑️
        </span>

        <div className="wallpaper-btn-wrapper">
          <span className="wallpaper-btn" title="Change theme" onClick={() => setShowWallpaperPicker((prev) => !prev)}>🎨</span>
          {showWallpaperPicker && (
            <div className="wallpaper-picker">
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
          <span className="back-tooltip">Go back to search users</span>
        </div>
      </div>

      {/* ── Clear chat confirm modal ── */}
      {showClearConfirm && ReactDOM.createPortal(
        <div className="img-preview-overlay" onClick={() => setShowClearConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'white', borderRadius: 16, padding: '28px 24px',
            width: 300, textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Clear your messages?</p>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
              This will delete all messages in this chat for you. This cannot be undone. After this Just "REFRESH ONCE"
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #ddd',
                  background: '#f5f5f5', cursor: 'pointer', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={clearChat}
                disabled={clearing}
                style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  background: '#e53935', color: 'white', cursor: 'pointer', fontWeight: 600
                }}
              >
                {clearing ? '⏳' : 'Clear'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="chat-msg" ref={chatMsgRef} onScroll={handleScroll} style={getChatMsgStyle()}>
        {messages.map((msg) => {
          const isMe = msg.user_id === currentUserId
          const isHovered = hoveredMsgId === msg.id

          return (
            <div key={msg.id} className={isMe ? 'r-msg' : 's-msg'}>
              <div className="msg-wrapper">

                {msg.image_url ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}
                    onMouseEnter={() => handleBubbleEnter(msg.id)} onMouseLeave={handleBubbleLeave}>
                    <img src={msg.image_url} alt="shared" className="chat-image" onClick={() => setPreviewImg(msg.image_url)} />
                    {isHovered && isMe && (
                      <div className="msg-context-menu menu-left"
                        onMouseEnter={() => clearTimeout(hoverTimer.current)} onMouseLeave={handleBubbleLeave}>
                        <button onClick={() => deleteMessage(msg.id)}>🗑 Delete</button>
                      </div>
                    )}
                  </div>

                ) : msg.video_url ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}
                    onMouseEnter={() => handleBubbleEnter(msg.id)} onMouseLeave={handleBubbleLeave}>
                    <div className="chat-video-wrapper">
                      <video src={msg.video_url} className="chat-video" controls preload="metadata" onClick={(e) => e.stopPropagation()} />
                      <button className="video-fullscreen-btn" title="Open fullscreen" onClick={() => setPreviewVideo(msg.video_url)}>⛶</button>
                    </div>
                    {isHovered && isMe && (
                      <div className="msg-context-menu menu-left"
                        onMouseEnter={() => clearTimeout(hoverTimer.current)} onMouseLeave={handleBubbleLeave}>
                        <button onClick={() => deleteMessage(msg.id)}>🗑 Delete</button>
                      </div>
                    )}
                  </div>

                ) : (
                  <div style={{ position: 'relative', display: 'inline-block' }}
                    onMouseEnter={() => handleBubbleEnter(msg.id)} onMouseLeave={handleBubbleLeave}>
                    <p className="msg" style={{
                      background: isMe ? wallpaper.bubbleSent : wallpaper.bubbleReceived,
                      color: isMe ? wallpaper.textSent : wallpaper.textReceived,
                    }}>
                      {msg.content}
                    </p>
                    {isHovered && (
                      <div className={`msg-context-menu ${isMe ? 'menu-left' : 'menu-right'}`}
                        onMouseEnter={() => clearTimeout(hoverTimer.current)} onMouseLeave={handleBubbleLeave}>
                        <button onClick={() => copyMessage(msg.content)}>📋 Copy</button>
                        {isMe && <button onClick={() => deleteMessage(msg.id)}>🗑 Delete</button>}
                      </div>
                    )}
                  </div>
                )}

                <div className="msg-info">
                  <img src={msg.avatar_url || DEFAULT_AVATAR} alt=""
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }} />
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

      {showScrollBtn && <button className="scroll-down-btn" onClick={scrollToBottom}>↓</button>}

      {stagedFile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', background: '#f0f0f0', borderTop: '1px solid #ddd'
        }}>
          {stagedFile.type === 'image'
            ? <img src={stagedFile.previewUrl} alt="preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} />
            : <video src={stagedFile.previewUrl} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 6 }} muted />
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

      <div className="chat-input" style={{ background: wallpaper.inputBar }}>
        {showEmoji && (
          <div className="emoji-picker" ref={emojiPickerRef}>
            {/* TEMP DEBUG: <EmojiPicker onEmojiClick={onEmojiClick} height={350} width={300} /> */}
            <div style={{padding: 20, color: '#333'}}>Emoji picker temporarily disabled for debugging</div>
          </div>
        )}

        <input
          ref={messageInputRef}
          id="chat-message"
          name="message"
          type="text"
          placeholder="Send a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            console.log('[DEBUG] onKeyDown fired, key:', e.key)
            if (e.key === 'Enter') {
              e.preventDefault()
              console.log('[DEBUG] Enter detected, calling sendMessage')
              sendMessage()
              setShowEmoji(false)
            }
          }}
          style={{ background: 'transparent', color: wallpaper.id === 'default' ? '#333' : wallpaper.textReceived }}
        />

        <span className="emoji-btn" ref={emojiBtnRef} onClick={() => setShowEmoji((prev) => !prev)}>😊</span>

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
        <label htmlFor="video-upload" title="Send video" style={{ cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
          🎥
        </label>

        <img src={assets.send_button} alt="" onClick={() => { sendMessage(); setShowEmoji(false) }} style={{ cursor: 'pointer' }} />
      </div>

      {/* ── Image preview portal ── */}
      {previewImg && ReactDOM.createPortal(
        <div className="img-preview-overlay" onClick={() => setPreviewImg(null)}>
          <div className="img-preview-box" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg} alt="preview" />
            <button className="img-preview-close" onClick={() => setPreviewImg(null)}>✕</button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Video preview portal ── */}
      {previewVideo && ReactDOM.createPortal(
        <div className="img-preview-overlay" onClick={() => setPreviewVideo(null)}>
          <div className="img-preview-box video-preview-box" onClick={(e) => e.stopPropagation()}>
            <video src={previewVideo} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '10px' }} />
            <button className="img-preview-close" onClick={() => setPreviewVideo(null)}>✕</button>
          </div>
        </div>,
        document.body
      )}

      {/* ── Video call portal ── */}
      {showVideoCall && user && ReactDOM.createPortal(
        <VideoCall
          currentUser={user}
          chatUser={chatUser}
          onClose={() => setShowVideoCall(false)}
        />,
        document.body
      )}
    </div>
  )
}

export default MiddleBox