import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable navigator locks to prevent orphaned lock issues
    // when Vue components unmount/remount via :key
    lock: null,
    storageKey: 'sb-auth-token',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
