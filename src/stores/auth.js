import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isAdmin = computed(() => profile.value?.role === 'admin')
  const isTeacher = computed(() => profile.value?.role === 'teacher')
  const displayName = computed(() => profile.value?.full_name || user.value?.email || '')
  const permissions = computed(() => profile.value?.permissions || {})

  async function initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user.value = session.user
        await fetchProfile()
      }
    } catch (err) {
      console.error('Auth init error:', err)
    } finally {
      initialized.value = true
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        user.value = session.user
        await fetchProfile()
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        profile.value = null
      }
    })
  }

  async function fetchProfile() {
    if (!user.value) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (!error && data) {
      profile.value = data
    }
  }

  async function login(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      user.value = data.user
      await fetchProfile()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
  }

  async function updateProfile(updates) {
    if (!user.value) return
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
    if (!error) {
      profile.value = { ...profile.value, ...updates }
    }
    return { error }
  }

  function hasPermission(levelId, weekId) {
    if (isAdmin.value) return true
    if (!permissions.value) return false
    const perms = permissions.value
    if (perms.all_levels) return true
    if (perms.levels && perms.levels.includes(Number(levelId))) {
      if (!weekId) return true
      if (perms.all_weeks) return true
      if (perms.weeks && perms.weeks.includes(Number(weekId))) return true
    }
    return false
  }

  return {
    user, profile, initialized, loading,
    isAdmin, isTeacher, displayName, permissions,
    initialize, login, logout, fetchProfile, updateProfile, hasPermission
  }
})
