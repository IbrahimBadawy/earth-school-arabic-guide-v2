import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper: ensure we have a valid session before making DB calls
export async function waitForSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  // Wait briefly and retry - session might be initializing
  return new Promise((resolve) => {
    const unsub = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        unsub.data?.subscription?.unsubscribe()
        resolve(session)
      }
    })
    // Timeout after 3 seconds
    setTimeout(() => {
      unsub.data?.subscription?.unsubscribe()
      resolve(null)
    }, 3000)
  })
}
