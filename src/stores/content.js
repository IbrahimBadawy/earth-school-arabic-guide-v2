import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useContentStore = defineStore('content', () => {

  const weeks = ref([])
  const days = ref([])
  const comments = ref([])
  const loading = ref(false)

  // Cached DB data
  const listeningGoals = ref([])
  const levelAxes = ref([])
  const activitiesDB = ref([])
  const assessmentItems = ref([])
  const teachingTools = ref([])
  const sessionPatterns = ref([])
  const progressionItems = ref([])
  const faqItems = ref([])
  const implementationTips = ref([])

  // Static level metadata (UI only - colors, icons)
  const levelsData = [
    { id: 1, name: 'المستوى الأول', age_range: '3-4 سنوات', students_count: 12, color: '#4CAF93', icon: 'pi pi-star', description: 'الوعي الصوتي والبصري وما قبل الكتابة', letters: ['ا', 'ب', 'ح', 'د', 'ر', 'س', 'ش', 'ع', 'ف', 'ك', 'ل', 'م', 'ن'] },
    { id: 2, name: 'المستوى الثاني', age_range: '4-5 سنوات', students_count: 6, color: '#FF9F43', icon: 'pi pi-star-fill', description: 'القراءة والكتابة المبدئية - مقسمين 3 أطفال من المستوى الأول و3 ممارسين' },
    { id: 3, name: 'المستوى الثالث', age_range: '5-6 سنوات', students_count: 5, color: '#6C63FF', icon: 'pi pi-trophy', description: 'القراءة والكتابة المتقدمة - مقسمين 3 أطفال من المستوى الثاني وطفلين ممارسين' }
  ]

  // ===== FETCH FUNCTIONS =====

  async function fetchListeningGoals() {

    if (listeningGoals.value.length) return listeningGoals.value
    const { data } = await supabase.from('listening_goals').select('*').order('sort_order')
    listeningGoals.value = data || []
    return data
  }

  async function fetchLevelAxes(levelId) {

    const { data } = await supabase.from('level_axes').select('*, axis_objectives(*)').eq('level_id', levelId).order('sort_order')
    if (data) {
      data.forEach(a => { if (a.axis_objectives) a.axis_objectives.sort((x, y) => x.sort_order - y.sort_order) })
    }
    return data || []
  }

  async function fetchActivities(levelId) {

    const { data } = await supabase.from('activities').select('*').eq('level_id', levelId).order('category').order('sort_order')
    return data || []
  }

  async function fetchAssessmentItems(levelId) {

    const { data } = await supabase.from('assessment_items').select('*').eq('level_id', levelId).order('sort_order')
    return data || []
  }

  async function fetchAllAssessments() {
    const { data } = await supabase.from('assessment_items').select('*').order('level_id').order('sort_order')
    assessmentItems.value = data || []
    return data
  }

  async function fetchTeachingTools() {

    if (teachingTools.value.length) return teachingTools.value
    const { data } = await supabase.from('teaching_tools').select('*').order('category')
    teachingTools.value = data || []
    return data
  }

  async function fetchSessionPatterns(levelId) {

    const { data } = await supabase.from('session_patterns').select('*').eq('level_id', levelId).order('pattern_name')
    return data || []
  }

  async function fetchProgressionItems() {

    if (progressionItems.value.length) return progressionItems.value
    const { data } = await supabase.from('progression_items').select('*').order('sort_order')
    progressionItems.value = data || []
    return data
  }

  async function fetchFaqItems() {

    const { data, error } = await supabase.from('faq_items').select('*').order('sort_order')
    if (error) console.warn('FAQ fetch error:', error.message)
    faqItems.value = data || []
    return data || []
  }

  async function fetchImplementationTips() {

    const { data, error } = await supabase.from('implementation_tips').select('*').order('sort_order')
    if (error) console.warn('Tips fetch error:', error.message)
    implementationTips.value = data || []
    return data
  }

  // ===== EXISTING FETCH FUNCTIONS =====

  async function fetchWeek(weekId) {

    const { data } = await supabase.from('weeks').select('*').eq('id', weekId).single()
    return data
  }

  async function fetchDay(dayId) {

    const { data } = await supabase.from('days').select('*, weeks(level_id, week_number, letter, title)').eq('id', dayId).single()
    return data
  }

  async function fetchWeeks(levelId) {

    loading.value = true
    const { data } = await supabase.from('weeks').select('*').eq('level_id', levelId).order('week_number')
    weeks.value = data || []
    loading.value = false
    return data
  }

  async function fetchDays(weekId) {

    loading.value = true
    const { data } = await supabase.from('days').select('*, day_activities(*)').eq('week_id', weekId).order('day_number')
    days.value = data || []
    loading.value = false
    return data
  }

  async function fetchComments(dayId) {

    const { data } = await supabase.from('comments').select('*, profiles(full_name, role)').eq('day_id', dayId).order('created_at', { ascending: false })
    comments.value = data || []
    return data
  }

  async function addComment(dayId, content) {
    const { data, error } = await supabase
      .from('comments')
      .insert({ day_id: dayId, content, user_id: (await supabase.auth.getUser()).data.user.id })
      .select('*, profiles(full_name, role)')
      .single()
    if (!error && data) comments.value.unshift(data)
    return { data, error }
  }

  async function markDayComplete(dayId, notes) {
    const { error } = await supabase.from('days').update({ is_completed: true, completion_notes: notes, completed_at: new Date().toISOString() }).eq('id', dayId)
    return { error }
  }

  // ===== DAY STEP ACTIVITIES =====
  async function fetchDayStepActivities(dayId) {

    const { data } = await supabase
      .from('day_step_activities')
      .select('*, activities(id, name, description, activity_type, duration, steps, tools, teacher_tips, differentiation, category)')
      .eq('day_id', dayId)
      .order('step_index')
      .order('sort_order')
    return data || []
  }

  async function saveDayStepActivity(record) {
    const { data, error } = record.id
      ? await supabase.from('day_step_activities').update(record).eq('id', record.id).select().single()
      : await supabase.from('day_step_activities').insert(record).select().single()
    return { data, error }
  }

  async function deleteDayStepActivity(id) {
    const { error } = await supabase.from('day_step_activities').delete().eq('id', id)
    return { error }
  }

  // ===== BULK EXPORT (single fetch per table) =====
  async function fetchAllForExport() {

    const [
      { data: goals }, { data: axes }, { data: activities },
      { data: assessments }, { data: tools }, { data: patterns },
      { data: progression }, { data: allWeeks }, { data: allDays },
      { data: allDayActs }
    ] = await Promise.all([
      supabase.from('listening_goals').select('*').order('sort_order'),
      supabase.from('level_axes').select('*, axis_objectives(*)').order('level_id').order('sort_order'),
      supabase.from('activities').select('*').order('level_id').order('category').order('sort_order'),
      supabase.from('assessment_items').select('*').order('level_id').order('sort_order'),
      supabase.from('teaching_tools').select('*').order('category'),
      supabase.from('session_patterns').select('*').order('level_id'),
      supabase.from('progression_items').select('*').order('sort_order'),
      supabase.from('weeks').select('*').order('level_id').order('week_number'),
      supabase.from('days').select('*').order('week_id').order('day_number'),
      supabase.from('day_step_activities').select('*, activities(name, description, activity_type)').order('step_index').order('sort_order')
    ])
    // Sort axis objectives
    ;(axes || []).forEach(a => { if (a.axis_objectives) a.axis_objectives.sort((x, y) => x.sort_order - y.sort_order) })
    return {
      goals: goals || [], axes: axes || [], activities: activities || [],
      assessments: assessments || [], tools: tools || [], patterns: patterns || [],
      progression: progression || [], weeks: allWeeks || [], days: allDays || [],
      dayActs: allDayActs || []
    }
  }

  // ===== CRUD FUNCTIONS (Admin) =====

  async function upsertRecord(table, record) {
    const { data, error } = record.id
      ? await supabase.from(table).update(record).eq('id', record.id).select().single()
      : await supabase.from(table).insert(record).select().single()
    return { data, error }
  }

  async function deleteRecord(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    return { error }
  }

  // ===== HELPERS =====

  function getLevelData(levelId) {
    return levelsData.find(l => l.id === Number(levelId))
  }

  return {
    weeks, days, comments, loading,
    listeningGoals, levelAxes, activitiesDB, assessmentItems, teachingTools,
    sessionPatterns, progressionItems, faqItems, implementationTips,
    levelsData,
    fetchListeningGoals, fetchLevelAxes, fetchActivities, fetchAssessmentItems, fetchAllAssessments,
    fetchTeachingTools, fetchSessionPatterns, fetchProgressionItems, fetchFaqItems, fetchImplementationTips,
    fetchWeek, fetchDay, fetchWeeks, fetchDays, fetchComments,
    fetchDayStepActivities, saveDayStepActivity, deleteDayStepActivity, fetchAllForExport,
    addComment, markDayComplete, upsertRecord, deleteRecord, getLevelData
  }
})
