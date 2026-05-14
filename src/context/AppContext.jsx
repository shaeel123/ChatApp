import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../config/supabase"

export const AppContext = createContext({
  userData: null,
  setUserData: () => {},
  loadUserData: () => {}
})

export const AppContextProvider = ({ children }) => {
  const [userData, setUserData] = useState(null)
  const [chatUser, setChatUser] = useState(null)

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

    // ✅ Sync email: if auth email differs from profile email, update profiles table
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
  }

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
  // ✅ don't interfere on reset password page
  if (window.location.pathname === '/reset-password') return

  if (session?.user) {
    await setOnlineStatus(session.user.id, true)
    loadUserData()
  } else {
    setUserData(null)
    setChatUser(null)
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
    }
  }, [])

  return (
    <AppContext.Provider value={{ userData, setUserData, loadUserData, chatUser, setChatUser }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error("useAppContext must be used within AppContextProvider")
  return context
}