import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-toastify'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    lock: async (name, acquireTimeout, fn) => {
      return fn()
    }
  }
})

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    console.error(error.message)
    return null
  }
  return data
}

export const login = async (email, password) => {
  console.log("login() called")
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  console.log("signInWithPassword result:", data, error)
  if (error) {
    console.error(error.message)
    return null
  }
  return data
}

// ✅ Add this logout function
export const logout = async () => {
  // Clear ALL localStorage so theme, preferences reset for next user
  localStorage.clear()
  
  const { error } = await supabase.auth.signOut()
  if (error) {
    toast.error("Logout failed. Please try again.")
    return false
  }
  return true
}

export const sendMessage = async (message, user) => {
  const { error } = await supabase
    .from('messages')
    .insert([{ user_id: user.id, username: user.email, content: message }])
  if (error) {
    toast.error("Message failed ❌")
    return false
  }
  return true
}

export const getMessages = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) console.error(error)
  return data
}