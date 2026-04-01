import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const assignments = ref([])

  const isSuperAdmin = computed(() => profile.value?.role === 'admin')
  const isSubjectAdmin = computed(() => profile.value?.role === 'subject_admin')
  const isAdmin = computed(() => isSuperAdmin.value || isSubjectAdmin.value)
  const isTeacher = computed(() => profile.value?.role === 'teacher')
  const displayName = computed(() => profile.value?.full_name || user.value?.email || '')
  const permissions = computed(() => profile.value?.permissions || {})

  async function initialize() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        user.value = session.user
        await fetchProfile()
        await fetchAssignments()
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
        await fetchAssignments()
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        profile.value = null
        assignments.value = []
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

  async function fetchAssignments() {
    if (!user.value) return
    const { data, error } = await supabase
      .from('teacher_assignments')
      .select('*, subjects(id, name, color, icon)')
      .eq('teacher_id', user.value.id)
    if (!error && data) {
      assignments.value = data
    }
  }

  function getMySubjects() {
    if (isAdmin.value) return [] // admin has access to all
    const subjectMap = {}
    assignments.value.forEach(a => {
      if (a.subjects) {
        subjectMap[a.subject_id] = a.subjects
      }
    })
    return Object.values(subjectMap)
  }

  function isAssignedTo(subjectId, levelId) {
    if (isSuperAdmin.value) return true
    return assignments.value.some(a => {
      if (subjectId && levelId) return a.subject_id === subjectId && a.level_id === levelId
      if (subjectId) return a.subject_id === subjectId
      if (levelId) return a.level_id === levelId
      return false
    })
  }

  // Can edit content in a specific subject?
  // Super admin: always. Subject admin: only assigned subjects. Teacher: never.
  function canEditSubject(subjectId) {
    if (isSuperAdmin.value) return true
    if (isSubjectAdmin.value) {
      return assignments.value.some(a => a.subject_id === subjectId)
    }
    return false
  }

  // Can manage system-level things (users, units, etc)?
  function canManageSystem() {
    return isSuperAdmin.value
  }

  async function login(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      user.value = data.user
      await fetchProfile()
      await fetchAssignments()
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
    assignments.value = []
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
    user, profile, initialized, loading, assignments,
    isSuperAdmin, isAdmin, isSubjectAdmin, isTeacher, displayName, permissions,
    initialize, login, logout, fetchProfile, updateProfile, hasPermission,
    fetchAssignments, getMySubjects, isAssignedTo, canEditSubject, canManageSystem
  }
})
