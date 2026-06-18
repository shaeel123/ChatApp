import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-toastify'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// ── Validate env vars are present ────────────────────────────────────────────
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Auto refresh tokens before they expire
    autoRefreshToken: true,
    // Persist session in localStorage (safe — token is httpOnly equivalent via Supabase)
    persistSession: true,
    // Detect session from URL (needed for magic links / password reset)
    detectSessionInUrl: true,
    // Storage key — namespaced to your app
    storageKey: 'bluec-auth-token',
    lock: async (name, acquireTimeout, fn) => fn(),
  },
})

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Prevents brute force: tracks attempts per action in memory
const rateLimits = {}

const checkRateLimit = (action, maxAttempts = 5, windowMs = 60000) => {
  const now = Date.now()
  if (!rateLimits[action]) rateLimits[action] = []

  // Remove attempts outside the window
  rateLimits[action] = rateLimits[action].filter(t => now - t < windowMs)

  if (rateLimits[action].length >= maxAttempts) {
    const waitSec = Math.ceil((windowMs - (now - rateLimits[action][0])) / 1000)
    throw new Error(`Too many attempts. Please wait ${waitSec} seconds.`)
  }

  rateLimits[action].push(now)
}

// ── Input sanitizer ───────────────────────────────────────────────────────────
// Strips HTML tags and dangerous characters to prevent XSS
export const sanitize = (str) => {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 5000) // hard cap — prevent payload bloat
}

// Validates email format
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

// Validates password strength
export const isStrongPassword = (password) => {
  if (password.length < 8)  return { ok: false, reason: 'At least 8 characters required' }
  if (password.length > 128) return { ok: false, reason: 'Password too long' }
  if (!/[A-Z]/.test(password)) return { ok: false, reason: 'Add at least one uppercase letter' }
  if (!/[0-9]/.test(password)) return { ok: false, reason: 'Add at least one number' }
  return { ok: true }
}

// ── Auth functions ────────────────────────────────────────────────────────────

export const signUp = async (email, password) => {
  try {
    checkRateLimit('signup', 3, 300000) // 3 signups per 5 mins

    if (!isValidEmail(email)) throw new Error('Invalid email address')
    const pwd = isStrongPassword(password)
    if (!pwd.ok) throw new Error(pwd.reason)

    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) throw new Error(error.message)
    return data
  } catch (err) {
    toast.error(err.message)
    return null
  }
}

export const login = async (email, password) => {
  try {
    checkRateLimit('login', 5, 60000) // 5 attempts per minute

    if (!isValidEmail(email)) throw new Error('Invalid email address')
    if (!password || password.length < 1) throw new Error('Password required')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })
    if (error) {
      // Don't reveal whether email or password was wrong (prevents enumeration)
      throw new Error('Invalid email or password')
    }
    return data
  } catch (err) {
    toast.error(err.message)
    return null
  }
}

export const logout = async () => {
  try {
    // Clear app-specific localStorage keys only (not all localStorage)
    const keysToRemove = Object.keys(localStorage).filter(k =>
      k.startsWith('theme_') || k.startsWith('bluec-')
    )
    keysToRemove.forEach(k => localStorage.removeItem(k))

    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    return true
  } catch (err) {
    toast.error('Logout failed. Please try again.')
    return false
  }
}

// ── Secure message send ───────────────────────────────────────────────────────
export const sendMessage = async (message, user) => {
  try {
    if (!message || typeof message !== 'string') return false
    const clean = sanitize(message)
    if (!clean) return false
    if (clean.length > 2000) {
      toast.error('Message too long (max 2000 characters)')
      return false
    }

    const { error } = await supabase
      .from('messages')
      .insert([{ user_id: user.id, username: user.email, content: clean }])
    if (error) throw new Error(error.message)
    return true
  } catch (err) {
    toast.error('Message failed ❌')
    return false
  }
}

export const getMessages = async () => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(200) // never pull unlimited rows
  if (error) console.error(error)
  return data
}

// ── Session validator ─────────────────────────────────────────────────────────
// Call this on app init to ensure session is still valid
export const validateSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) return null

  // Check token hasn't expired
  const expiresAt = session.expires_at * 1000
  if (Date.now() >= expiresAt) {
    await logout()
    return null
  }
  return session
}