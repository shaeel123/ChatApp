import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "../config/supabase"

export const AppContext = createContext({
  userData: null,
  setUserData: () => {},
  loadUserData: () => {},
  incomingCall: null,
  setIncomingCall: () => {},
})

export const AppContextProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)
  const [chatUser, setChatUser] = useState(null)
  const [incomingCall, setIncomingCall] = useState(null)
  const callChannelRef = useRef(null)

  const setOnlineStatus = async (userId, status) => {
    await supabase
      .from('profiles')
      .update({ is_online: status })
      .eq('id', userId)
  }

  const loadUserData = async () => {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) return

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .maybeSingle()

    if (error) { console.error("Error loading profile:", error); return }
    if (!profile) return

    if (authData.user.email && authData.user.email !== profile.email) {
      await supabase
        .from('profiles')
        .update({ email: authData.user.email })
        .eq('id', authData.user.id)
      profile.email = authData.user.email
    }

    if (profile.avatar_url) {
      profile.avatar_url = `${profile.avatar_url}?t=${Date.now()}`
    }

    await setOnlineStatus(authData.user.id, true)
    setUserData(profile)

    // Subscribe to incoming video call signals for this user
    subscribeToCallSignals(authData.user.id)
  }

  const subscribeToCallSignals = (myId) => {
    if (callChannelRef.current) {
      supabase.removeChannel(callChannelRef.current)
    }

    callChannelRef.current = supabase
      .channel(`incoming-call-${myId}`)
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        // Only show if not already in a call
        setIncomingCall(prev => prev ? prev : payload)
      })
      .subscribe()
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (window.location.pathname === '/reset-password') return

      if (session?.user) {
        await setOnlineStatus(session.user.id, true)
        setChatUser(null)
        loadUserData()
      } else {
        setUserData(null)
        setChatUser(null)
        setIncomingCall(null)
        if (callChannelRef.current) {
          supabase.removeChannel(callChannelRef.current)
          callChannelRef.current = null
        }
      }
    })

    loadUserData()

    const handleBeforeUnload = async () => {
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        await setOnlineStatus(authData.user.id, false)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (callChannelRef.current) supabase.removeChannel(callChannelRef.current)
    }
  }, [])

  return (
    <AppContext.Provider value={{
      userData, setUserData, loadUserData,
      chatUser, setChatUser,
      incomingCall, setIncomingCall,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error("useAppContext must be used within AppContextProvider")
  return context
}