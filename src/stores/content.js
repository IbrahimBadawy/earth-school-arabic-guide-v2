import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export const useContentStore = defineStore('content', () => {

  const weeks = ref([])
  const days = ref([])
  const comments = ref([])
  const loading = ref(false)

  // Units
  const units = ref([])
  const activeUnit = ref(null)

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

  // Levels from DB (dynamic)
  const levelsData = ref([])
  const levelsLoaded = ref(false)

  // ===== UNITS FUNCTIONS =====

  async function fetchUnits() {
    const { data, error } = await supabase.from('units').select('*').order('sort_order').order('created_at', { ascending: false })
    if (error) console.warn('Units fetch error:', error.message)
    units.value = data || []
    // Auto-select active unit if not set
    if (!activeUnit.value && units.value.length) {
      const active = units.value.find(u => u.is_active)
      activeUnit.value = active || units.value[0]
    }
    return data || []
  }

  async function setActiveUnit(unitId) {
    const unit = units.value.find(u => u.id === unitId)
    if (unit) {
      activeUnit.value = unit
      // Clear cached data so it re-fetches with new unit filter
      listeningGoals.value = []
      progressionItems.value = []
      faqItems.value = []
      implementationTips.value = []
      teachingTools.value = []
    }
  }

  async function cloneUnit(sourceUnitId, newName, newDescription) {
    // 1. Create new unit based on source
    const sourceUnit = units.value.find(u => u.id === sourceUnitId)
    if (!sourceUnit) return { error: { message: 'Unit not found' } }

    const { data: newUnit, error: unitError } = await supabase.from('units').insert({
      name: newName,
      description: newDescription || sourceUnit.description,
      year: sourceUnit.year,
      start_date: sourceUnit.start_date,
      session_days: sourceUnit.session_days,
      weeks_count: sourceUnit.weeks_count,
      sessions_per_week: sourceUnit.sessions_per_week,
      session_duration: sourceUnit.session_duration,
      is_active: false,
      is_template: false,
      cloned_from: sourceUnitId,
      sort_order: (units.value.length + 1) * 10
    }).select().single()

    if (unitError) return { error: unitError }

    const newUnitId = newUnit.id

    // 2. Clone all content tables
    const tablesToClone = [
      { table: 'listening_goals', idField: 'id' },
      { table: 'progression_items', idField: 'id' },
      { table: 'faq_items', idField: 'id' },
      { table: 'implementation_tips', idField: 'id' }
    ]

    for (const { table } of tablesToClone) {
      const { data: rows } = await supabase.from(table).select('*').eq('unit_id', sourceUnitId)
      if (rows?.length) {
        const cloned = rows.map(r => {
          const { id, created_at, updated_at, ...rest } = r
          return { ...rest, unit_id: newUnitId }
        })
        await supabase.from(table).insert(cloned)
      }
    }

    // 3. Clone level-scoped tables (need to preserve level_id references)
    const levelScopedTables = [
      { table: 'level_axes', hasChildren: true, childTable: 'axis_objectives', parentKey: 'axis_id' },
      { table: 'activities', hasChildren: false },
      { table: 'assessment_items', hasChildren: false },
      { table: 'session_patterns', hasChildren: false }
    ]

    for (const config of levelScopedTables) {
      const { data: rows } = await supabase.from(config.table).select('*').eq('unit_id', sourceUnitId)
      if (rows?.length) {
        for (const row of rows) {
          const oldId = row.id
          const { id, created_at, updated_at, ...rest } = row
          const { data: newRow } = await supabase.from(config.table).insert({ ...rest, unit_id: newUnitId }).select().single()

          // Clone children if applicable
          if (config.hasChildren && newRow) {
            const { data: children } = await supabase.from(config.childTable).select('*').eq(config.parentKey, oldId)
            if (children?.length) {
              const clonedChildren = children.map(c => {
                const { id: cId, created_at: cCa, updated_at: cUa, ...cRest } = c
                return { ...cRest, [config.parentKey]: newRow.id }
              })
              await supabase.from(config.childTable).insert(clonedChildren)
            }
          }
        }
      }
    }

    // 4. Clone weeks and days
    const { data: sourceWeeks } = await supabase.from('weeks').select('*, days(*)').eq('unit_id', sourceUnitId).order('week_number')
    if (sourceWeeks?.length) {
      for (const week of sourceWeeks) {
        const { id: weekId, created_at, updated_at, days: weekDays, ...weekRest } = week
        const { data: newWeek } = await supabase.from('weeks').insert({ ...weekRest, unit_id: newUnitId }).select().single()

        if (newWeek && weekDays?.length) {
          for (const day of weekDays) {
            const { id: dayId, created_at: dCa, updated_at: dUa, ...dayRest } = day
            const { data: newDay } = await supabase.from('days').insert({ ...dayRest, week_id: newWeek.id }).select().single()

            // Clone day_step_activities
            if (newDay) {
              const { data: stepActs } = await supabase.from('day_step_activities').select('*').eq('day_id', dayId)
              if (stepActs?.length) {
                const clonedStepActs = stepActs.map(sa => {
                  const { id: saId, created_at: saCa, ...saRest } = sa
                  return { ...saRest, day_id: newDay.id }
                })
                await supabase.from('day_step_activities').insert(clonedStepActs)
              }
            }
          }
        }
      }
    }

    await fetchUnits()
    return { data: newUnit, error: null }
  }

  // ===== LEVELS =====

  async function fetchLevels() {
    if (levelsLoaded.value && levelsData.value.length) return levelsData.value
    const { data } = await supabase.from('levels').select('*').order('sort_order')
    levelsData.value = data || []
    levelsLoaded.value = true
    return data || []
  }

  // Force refresh levels
  async function reloadLevels() {
    levelsLoaded.value = false
    return await fetchLevels()
  }

  // ===== FETCH FUNCTIONS =====

  async function fetchListeningGoals() {
    if (listeningGoals.value.length) return listeningGoals.value
    let query = supabase.from('listening_goals').select('*').order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
    listeningGoals.value = data || []
    return data
  }

  async function fetchLevelAxes(levelId) {
    let query = supabase.from('level_axes').select('*, axis_objectives(*)').eq('level_id', levelId).order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
    if (data) {
      data.forEach(a => { if (a.axis_objectives) a.axis_objectives.sort((x, y) => x.sort_order - y.sort_order) })
    }
    return data || []
  }

  async function fetchActivities(levelId) {
    let query = supabase.from('activities').select('*').eq('level_id', levelId).order('category').order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
    return data || []
  }

  async function fetchAssessmentItems(levelId) {
    let query = supabase.from('assessment_items').select('*').eq('level_id', levelId).order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
    return data || []
  }

  async function fetchAllAssessments() {
    let query = supabase.from('assessment_items').select('*').order('level_id').order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
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
    let query = supabase.from('session_patterns').select('*').eq('level_id', levelId).order('pattern_name')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
    return data || []
  }

  async function fetchProgressionItems() {
    if (progressionItems.value.length) return progressionItems.value
    let query = supabase.from('progression_items').select('*').order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
    progressionItems.value = data || []
    return data
  }

  async function fetchFaqItems() {
    let query = supabase.from('faq_items').select('*').order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data, error } = await query
    if (error) console.warn('FAQ fetch error:', error.message)
    faqItems.value = data || []
    return data || []
  }

  async function fetchImplementationTips() {
    let query = supabase.from('implementation_tips').select('*').order('sort_order')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data, error } = await query
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
    let query = supabase.from('weeks').select('*').eq('level_id', levelId).order('week_number')
    if (activeUnit.value?.id) query = query.eq('unit_id', activeUnit.value.id)
    const { data } = await query
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
    const unitFilter = activeUnit.value?.id

    let goalsQ = supabase.from('listening_goals').select('*').order('sort_order')
    let axesQ = supabase.from('level_axes').select('*, axis_objectives(*)').order('level_id').order('sort_order')
    let activitiesQ = supabase.from('activities').select('*').order('level_id').order('category').order('sort_order')
    let assessmentsQ = supabase.from('assessment_items').select('*').order('level_id').order('sort_order')
    let toolsQ = supabase.from('teaching_tools').select('*').order('category')
    let patternsQ = supabase.from('session_patterns').select('*').order('level_id')
    let progressionQ = supabase.from('progression_items').select('*').order('sort_order')
    let weeksQ = supabase.from('weeks').select('*').order('level_id').order('week_number')
    let daysQ = supabase.from('days').select('*').order('week_id').order('day_number')
    let dayActsQ = supabase.from('day_step_activities').select('*, activities(name, description, activity_type)').order('step_index').order('sort_order')

    if (unitFilter) {
      goalsQ = goalsQ.eq('unit_id', unitFilter)
      axesQ = axesQ.eq('unit_id', unitFilter)
      activitiesQ = activitiesQ.eq('unit_id', unitFilter)
      assessmentsQ = assessmentsQ.eq('unit_id', unitFilter)
      patternsQ = patternsQ.eq('unit_id', unitFilter)
      progressionQ = progressionQ.eq('unit_id', unitFilter)
      weeksQ = weeksQ.eq('unit_id', unitFilter)
    }

    const [
      { data: goals }, { data: axes }, { data: activities },
      { data: assessments }, { data: tools }, { data: patterns },
      { data: progression }, { data: allWeeks }, { data: allDays },
      { data: allDayActs }
    ] = await Promise.all([
      goalsQ, axesQ, activitiesQ, assessmentsQ, toolsQ,
      patternsQ, progressionQ, weeksQ, daysQ, dayActsQ
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
    // Auto-set unit_id for tables that support it
    const unitTables = ['weeks', 'activities', 'assessment_items', 'level_axes', 'session_patterns', 'listening_goals', 'faq_items', 'implementation_tips', 'progression_items']
    if (unitTables.includes(table) && activeUnit.value?.id && !record.unit_id) {
      record = { ...record, unit_id: activeUnit.value.id }
    }
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
    return levelsData.value.find(l => l.id === Number(levelId))
  }

  return {
    weeks, days, comments, loading,
    units, activeUnit,
    listeningGoals, levelAxes, activitiesDB, assessmentItems, teachingTools,
    sessionPatterns, progressionItems, faqItems, implementationTips,
    levelsData, levelsLoaded, fetchLevels, reloadLevels,
    fetchUnits, setActiveUnit, cloneUnit,
    fetchListeningGoals, fetchLevelAxes, fetchActivities, fetchAssessmentItems, fetchAllAssessments,
    fetchTeachingTools, fetchSessionPatterns, fetchProgressionItems, fetchFaqItems, fetchImplementationTips,
    fetchWeek, fetchDay, fetchWeeks, fetchDays, fetchComments,
    fetchDayStepActivities, saveDayStepActivity, deleteDayStepActivity, fetchAllForExport,
    addComment, markDayComplete, upsertRecord, deleteRecord, getLevelData
  }
})
