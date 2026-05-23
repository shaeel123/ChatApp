import React, { useState, useEffect, useRef } from 'react'
import './LeftSidebar.css'
import assets from '../../assets/assets'
import { useAppContext } from '../../context/AppContext'
import { supabase } from '../../config/supabase'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const DEFAULT_AVATAR = assets.avatar_icon

const LeftSidebar = () => {
  const navigate = useNavigate()
  const { userData, setChatUser, chatUser } = useAppContext()
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [conversations, setConversations] = useState([])
  const channelRef = useRef(null)
  const clearChannelRef = useRef(null)

  const fetchConversations = async () => {
    // ✅ Get auth user directly — never rely on userData timing
    const { data: authData } = await supabase.auth.getUser()
    const myId = authData?.user?.id
    console.log('🔍 myId:', myId)
    if (!myId) return

    // Get clear timestamps
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
      if (clearedAt && new Date(msg.created_at) <= new Date(clearedAt)) continue

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

  // ✅ Run on mount — catches already logged-in users
  useEffect(() => {
    fetchConversations()

    // ✅ Also re-run when auth state changes (fresh login)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) fetchConversations()
    })

    return () => authListener.subscription.unsubscribe()
  }, [])

  // ✅ Also re-run when userData loads (belt + suspenders)
  useEffect(() => {
    if (userData?.id) fetchConversations()
  }, [userData?.id])

  // ✅ Realtime subscriptions
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
      .neq('id', userData?.id)

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
          <img src={assets.logo} className='logo' alt="" />
          <div className="menu" style={{ position: 'relative' }}>
            <img
              src={assets.menu_icon}
              alt=""
              onClick={() => setShowMenu((prev) => !prev)}
            />
            {showMenu && (
              <div className="sub-menu">
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
    </div>
  )
}

export default LeftSidebar