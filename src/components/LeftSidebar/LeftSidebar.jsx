import React, { useState, useEffect, useRef } from 'react'
import './LeftSidebar.css'
import assets from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import ReactDOM from 'react-dom'
import VideoCall from '../VideoCall/VideoCall'

const DEFAULT_AVATAR = assets.avatar_icon

const LeftSidebar = () => {
  const navigate = useNavigate()
  const { userData, setChatUser, chatUser, incomingCall, setIncomingCall } = useAppContext()
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [conversations, setConversations] = useState([])
  // Incoming call state
  const [callerProfile, setCallerProfile] = useState(null)
  const [showIncomingCall, setShowIncomingCall] = useState(false)
  const [acceptedCall, setAcceptedCall] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const channelRef = useRef(null)
  const clearChannelRef = useRef(null)
  const ringtoneRef = useRef(null)
  const menuRef = useRef(null)
  const menuBtnRef = useRef(null)

  // Load current auth user once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUser(data.user)
    })
  }, [])

  // Close the 3-dot menu when clicking anywhere outside it
 useEffect(() => {
  if (!showMenu) return
  console.log('MENU LISTENER ATTACHED')
  const handleClickOutside = (e) => {
    const clickedMenu = menuRef.current && menuRef.current.contains(e.target)
    const clickedBtn = menuBtnRef.current && menuBtnRef.current.contains(e.target)
    console.log('CLICK OUTSIDE CHECK', { clickedMenu, clickedBtn, target: e.target })
    if (!clickedMenu && !clickedBtn) {
      setShowMenu(false)
    }
  }
  document.addEventListener('mouseup', handleClickOutside)
  return () => {
    console.log('MENU LISTENER REMOVED')
    document.removeEventListener('mouseup', handleClickOutside)
  }
}, [showMenu])

  // When incomingCall changes (set by AppContext), load caller profile and ring
  useEffect(() => {
    if (!incomingCall) {
      setCallerProfile(null)
      setShowIncomingCall(false)
      stopRing()
      return
    }

    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, email')
        .eq('id', incomingCall.from)
        .maybeSingle()
      if (data) setCallerProfile(data)
    }
    load()
    setShowIncomingCall(true)
    playRing()

    // Auto-dismiss after 30s if not answered
    const timer = setTimeout(() => {
      setIncomingCall(null)
      stopRing()
    }, 30000)

    return () => clearTimeout(timer)
  }, [incomingCall])

  const playRing = () => {
    try {
      const audio = new Audio('https://www.soundjay.com/phone/sounds/phone-ringing-1.mp3')
      audio.loop = true
      audio.volume = 0.5
      ringtoneRef.current = audio
      audio.play().catch(() => {})
    } catch (_) {}
  }

  const stopRing = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause()
      ringtoneRef.current = null
    }
  }

  const handleAcceptCall = () => {
    stopRing()
    setShowIncomingCall(false)
    setAcceptedCall(true)
  }

  const handleDeclineCall = () => {
    stopRing()
    setIncomingCall(null)
    setShowIncomingCall(false)
  }

  const handleCallClose = () => {
    setAcceptedCall(false)
    setIncomingCall(null)
  }

  const fetchConversations = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const myId = authData?.user?.id
    console.log('🔍 myId:', myId)
    if (!myId) return

    let clearMap = {}
    try {
      const { data: clearData } = await supabase
        .from('chat_clears')
        .select('other_user_id, cleared_at')
        .eq('user_id', myId)
      if (clearData) clearData.forEach(c => { clearMap[c.other_user_id] = c.cleared_at })
    } catch (_) {}

    const { data: sent, error: e1 } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', myId)
      .order('created_at', { ascending: false })

    const { data: received, error: e2 } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', myId)
      .order('created_at', { ascending: false })

    console.log('📤 sent:', sent?.length, 'e1:', e1?.message)
    console.log('📥 received:', received?.length, 'e2:', e2?.message)

    const msgs = [...(sent || []), ...(received || [])]
    console.log('📨 total msgs:', msgs.length)
    if (msgs.length === 0) { setConversations([]); return }

    msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const convMap = {}
    for (const msg of msgs) {
      const otherId = msg.user_id === myId ? msg.receiver_id : msg.user_id
      if (!otherId) continue

      const clearedAt = clearMap[otherId] || null
      if (clearedAt && new Date(msg.created_at + 'Z') <= new Date(clearedAt)) continue

      if (!convMap[otherId]) {
        convMap[otherId] = { otherId, latestMsg: msg, unread: 0 }
      }
      if (msg.receiver_id === myId && !msg.is_read) {
        convMap[otherId].unread++
      }
    }

    const otherIds = Object.keys(convMap)
    console.log('👥 otherIds:', otherIds)
    if (otherIds.length === 0) { setConversations([]); return }

    const { data: profiles, error: e3 } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, email, bio, is_online')
      .in('id', otherIds)

    console.log('👤 profiles:', profiles?.length, 'e3:', e3?.message)
    if (!profiles || profiles.length === 0) return

    const result = profiles.map(profile => ({
      ...profile,
      latestMsg: convMap[profile.id]?.latestMsg,
      unread: convMap[profile.id]?.unread || 0,
    })).sort((a, b) =>
      new Date(b.latestMsg?.created_at || 0) - new Date(a.latestMsg?.created_at || 0)
    )

    console.log('✅ conversations set:', result.length)
    setConversations(result)
  }

  useEffect(() => {
    fetchConversations()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) fetchConversations()
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (userData?.id) fetchConversations()
  }, [userData?.id])

  useEffect(() => {
    const setupRealtime = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const myId = authData?.user?.id
      if (!myId) return

      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = supabase
        .channel(`sidebar-msgs-${myId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const msg = payload.new
            if (msg.user_id === myId || msg.receiver_id === myId) fetchConversations()
          }
        )
        .subscribe()

      if (clearChannelRef.current) supabase.removeChannel(clearChannelRef.current)
      clearChannelRef.current = supabase
        .channel(`sidebar-clears-${myId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_clears' },
          () => fetchConversations()
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (clearChannelRef.current) supabase.removeChannel(clearChannelRef.current)
    }
  }, [userData?.id])

  const handleSelectConversation = async (user) => {
    setChatUser(user)

    setConversations(prev =>
      prev.map(c => c.id === user.id ? { ...c, unread: 0 } : c)
    )

    const { data: authData } = await supabase.auth.getUser()
    const myId = authData?.user?.id
    if (!myId) return

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', myId)
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) console.error('Mark read error:', error)
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you sure? This will permanently delete your account and all your data.")
    if (!confirmed) return

    try {
      await supabase.from('messages').delete().eq('user_id', userData.id)
      await supabase.from('profiles').delete().eq('id', userData.id)

      const { error } = await supabase.rpc('delete_user')
      if (error) {
        console.error("Delete user error:", error)
        toast.error("Failed to delete account.")
        return
      }

      localStorage.clear()
      await supabase.auth.signOut()
      setChatUser(null)
      navigate('/')
    } catch (err) {
      console.error(err)
      toast.error("Something went wrong.")
    }
  }

  const handleSearch = async (e) => {
    const value = e.target.value
    setQuery(value)

    if (!value.trim()) {
      setSearchResults([])
      setSearched(false)
      return
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, email, bio, is_online")
      .or(`name.ilike.%${value}%,email.ilike.%${value}%`)
      .neq('id', userData?.id || '00000000-0000-0000-0000-000000000000')

    setSearched(true)
    if (error || !data) { setSearchResults([]); return }
    setSearchResults(data)
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp + 'Z')
    const now = new Date()
    const diff = now - date
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
      })
    }
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }

  const truncate = (text, len = 20) => {
    if (!text) return ''
    return text.length > len ? text.slice(0, len) + '...' : text
  }

  return (
    <div className='ls'>
      <div className="ls-top">
        <div className="ls-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={assets.logo_icon} style={{ width: '35px' }} alt="" />
            <span style={{
              color: 'white',
              fontSize: '42px',
              fontFamily: "'Pacifico', cursive",
              letterSpacing: '2px'
            }}>BlueC</span>
          </div>
          <div className="menu" style={{ position: 'relative' }}>
            <img
              ref={menuBtnRef}
              src={assets.menu_icon}
              alt=""
              onClick={() => setShowMenu((prev) => !prev)}
            />
            {showMenu && (
              <div className="sub-menu" ref={menuRef}>
                <p onClick={() => { navigate('/profile'); setShowMenu(false) }}>Edit Profile</p>
                <hr />
                <p onClick={handleDeleteAccount} style={{ color: 'red' }}>Delete Account</p>
              </div>
            )}
          </div>
        </div>

        <div className="ls-search">
          <img src={assets.search_icon} alt="" />
          <input
            type="text"
            placeholder='Search users...'
            value={query}
            onChange={handleSearch}
          />
          {query && (
            <span
              style={{ cursor: 'pointer', padding: '0 8px', color: '#aaa' }}
              onClick={() => { setQuery(''); setSearchResults([]); setSearched(false) }}
            >✕</span>
          )}
        </div>
      </div>

      {/* ── Incoming call banner ── */}
      {showIncomingCall && callerProfile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'linear-gradient(90deg, #1a1a2e, #0f3460)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          animation: 'incoming-ring 0.6s ease-in-out infinite alternate',
        }}>
          <img
            src={callerProfile.avatar_url || DEFAULT_AVATAR}
            alt=""
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #4caf50' }}
            onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0 }}>
              {callerProfile.name || callerProfile.email || 'Unknown'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>📹 Incoming video call…</p>
          </div>
          <button
            onClick={handleAcceptCall}
            style={{
              background: '#4caf50', color: 'white', border: 'none',
              borderRadius: 20, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
            }}
          >
            Accept
          </button>
          <button
            onClick={handleDeclineCall}
            style={{
              background: '#e53935', color: 'white', border: 'none',
              borderRadius: 20, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
            }}
          >
            Decline
          </button>
        </div>
      )}

      <div className="ls-list">
        {query.trim() ? (
          searchResults.length > 0 ? (
            searchResults.map((user) => (
              <div
                key={user.id}
                className={`friends ${chatUser?.id === user.id ? 'active-chat' : ''}`}
                onClick={() => { handleSelectConversation(user); setQuery(''); setSearchResults([]) }}
              >
                <div className="friend-avatar-wrapper">
                  <img
                    src={user.avatar_url || DEFAULT_AVATAR}
                    alt=""
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
                  />
                  {user.is_online && <span className="online-dot"></span>}
                </div>
                <div className="friend-info">
                  <p className="friend-name">{user.name?.trim() || user.email || "Unnamed User"}</p>
                  <span className="friend-preview">Click to chat</span>
                </div>
              </div>
            ))
          ) : searched ? (
            <p className="ls-no-user">No user found</p>
          ) : null
        ) : (
          conversations.length > 0 ? (
            conversations.map((user) => (
              <div
                key={user.id}
                className={`friends ${chatUser?.id === user.id ? 'active-chat' : ''}`}
                onClick={() => handleSelectConversation(user)}
              >
                <div className="friend-avatar-wrapper">
                  <img
                    src={user.avatar_url || DEFAULT_AVATAR}
                    alt=""
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR }}
                  />
                  {user.is_online && <span className="online-dot"></span>}
                </div>

                <div className="friend-info">
                  <p className="friend-name">{user.name?.trim() || user.email || "Unnamed"}</p>

                  <div className="friend-bottom-row">
                    <span className="friend-preview">
                      {user.latestMsg?.image_url
                        ? '📷 Image'
                        : user.latestMsg?.video_url
                        ? '🎥 Video'
                        : truncate(user.latestMsg?.content)}
                    </span>
                    <div className="friend-meta">
                      <span className="friend-time">{formatTime(user.latestMsg?.created_at)}</span>
                      {user.unread > 0 && (
                        <span className="unread-badge">{user.unread > 99 ? '99+' : user.unread}</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ))
          ) : (
            <p className="ls-empty">Search for a user to start chatting</p>
          )
        )}
      </div>

      {/* ── Accepted incoming call portal ── */}
      {acceptedCall && currentUser && callerProfile && ReactDOM.createPortal(
        <VideoCall
          currentUser={currentUser}
          chatUser={callerProfile}
          onClose={handleCallClose}
        />,
        document.body
      )}
    </div>
  )
}

export default LeftSidebar