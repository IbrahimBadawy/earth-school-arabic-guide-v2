<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '@/stores/content'
import { useAuthStore } from '@/stores/auth'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Breadcrumb from 'primevue/breadcrumb'
import Textarea from 'primevue/textarea'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import QuickNav from '@/components/common/QuickNav.vue'
import IconPicker from '@/components/common/IconPicker.vue'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const router = useRouter()
const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()

const levelId = computed(() => Number(route.params.levelId))
const weekId = computed(() => route.params.weekId)
const dayId = computed(() => route.params.dayId)
const level = computed(() => contentStore.getLevelData(levelId.value))

const comments = ref([])
const newComment = ref('')
const showCompleteDialog = ref(false)
const completionNotes = ref('')
const dayCompleted = ref(false)
const dayData = ref(null)
const weekData = ref(null)
const sessionSteps = ref([])
const activities = ref({})
const allActivitiesList = ref([])
const dayStepActivities = ref([])
const showAssignDialog = ref(false)
const assignStepIdx = ref(-1)
const assignMode = ref('library') // 'library' or 'custom'
const selectedActivityId = ref(null)
const customActivityForm = ref({ custom_name: '', custom_description: '', custom_steps: '', custom_tools: '', custom_tips: '', custom_duration: 8 })
const showEditDayDialog = ref(false)
const expandedAct = ref(null)
const showEditActDialog = ref(false)
const editActForm = ref({})
const showNoteDialog = ref(false)
const editingNoteDsa = ref(null)
const editingNoteIdx = ref(-1)
const noteText = ref('')
const editDayForm = ref({})
const showEditStepDialog = ref(false)
const editingStepIdx = ref(-1)
const stepForm = ref({ order: 1, name: '', duration: 8, icon: 'pi pi-star', description: '' })
const currentPatternId = ref(null)

const weekNumber = computed(() => weekData.value?.week_number || '')

const breadcrumbItems = computed(() => [
  { label: 'الرئيسية', command: () => router.push('/') },
  { label: level.value?.name, command: () => router.push(`/level/${levelId.value}`) },
  { label: weekData.value?.title || `الأسبوع ${weekNumber.value}`, command: () => router.push(`/level/${levelId.value}/week/${weekId.value}`) },
  { label: dayData.value?.title || 'اليوم' }
])
const breadcrumbHome = { icon: 'pi pi-home', command: () => router.push('/') }

const currentLetter = computed(() => {
  if (weekData.value?.focus_item) return weekData.value.focus_item
  return ''
})

// Watch for route changes to reload data
watch(() => route.params.dayId, loadData, { immediate: true })

async function loadData() {
  const currentDayId = route.params.dayId
  if (!currentDayId) return

  // Fetch day data with week info
  const dData = await contentStore.fetchDay(currentDayId)
  if (dData) {
    dayData.value = dData
    dayCompleted.value = dData.is_completed || false
    if (dData.weeks) weekData.value = dData.weeks
  }

  // Fetch week data if needed
  const currentWeekId = route.params.weekId
  if (!weekData.value && currentWeekId) {
    const wData = await contentStore.fetchWeek(currentWeekId)
    if (wData) weekData.value = wData
  }

  // Fetch session patterns from DB
  const currentLevelId = Number(route.params.levelId)
  const patterns = await contentStore.fetchSessionPatterns(currentLevelId)
  if (patterns && patterns.length > 0) {
    const dayNum = dayData.value?.day_number || 1
    let selectedPattern
    if (currentLevelId === 3 && patterns.length > 1) {
      selectedPattern = patterns[dayNum === 1 ? 0 : 1] || patterns[0]
    } else {
      selectedPattern = patterns[0]
    }
    sessionSteps.value = selectedPattern?.steps || []
    currentPatternId.value = selectedPattern?.id || null
  }

  // Fetch activities library for this level
  const acts = await contentStore.fetchActivities(currentLevelId)
  allActivitiesList.value = acts || []
  const grouped = {}
  ;(acts || []).forEach(a => {
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(a)
  })
  activities.value = grouped

  // Fetch assigned day-specific activities
  dayStepActivities.value = await contentStore.fetchDayStepActivities(currentDayId)

  // Fetch comments
  await contentStore.fetchComments(currentDayId)
  comments.value = contentStore.comments
}

async function submitComment() {
  if (!newComment.value.trim()) return
  const result = await contentStore.addComment(dayId.value, newComment.value)
  if (!result.error) {
    comments.value = contentStore.comments
    newComment.value = ''
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم إضافة التعليق بنجاح', life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: result.error.message || 'حدث خطأ', life: 5000 })
  }
}

async function markComplete() {
  const { error } = await contentStore.markDayComplete(dayId.value, completionNotes.value)
  if (!error) {
    dayCompleted.value = true
    showCompleteDialog.value = false
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم تحديد اليوم كمكتمل', life: 3000 })
  }
}

function openEditDay() {
  editDayForm.value = {
    id: dayData.value?.id,
    title: dayData.value?.title || '',
    summary: dayData.value?.summary || '',
    objectives: (dayData.value?.objectives || []).join('\n'),
    teacher_notes: dayData.value?.teacher_notes || ''
  }
  showEditDayDialog.value = true
}

async function saveDay() {
  const payload = {
    id: editDayForm.value.id,
    title: editDayForm.value.title,
    summary: editDayForm.value.summary,
    objectives: editDayForm.value.objectives.split('\n').filter(o => o.trim()),
    teacher_notes: editDayForm.value.teacher_notes
  }
  const { error } = await contentStore.upsertRecord('days', payload)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ التعديلات', life: 3000 })
    showEditDayDialog.value = false
    await loadData()
  }
}

// ===== Scenario Step CRUD =====
function openAddStep() {
  editingStepIdx.value = -1
  stepForm.value = { order: sessionSteps.value.length + 1, name: '', duration: 8, icon: 'pi pi-star', description: '' }
  showEditStepDialog.value = true
}

function openEditStep(step, idx) {
  editingStepIdx.value = idx
  stepForm.value = { ...step }
  showEditStepDialog.value = true
}

async function saveStep() {
  const steps = [...sessionSteps.value]
  if (editingStepIdx.value >= 0) {
    steps[editingStepIdx.value] = { ...stepForm.value }
  } else {
    steps.push({ ...stepForm.value })
  }
  // Re-number orders
  steps.forEach((s, i) => { s.order = i + 1 })

  const { error } = await contentStore.upsertRecord('session_patterns', {
    id: currentPatternId.value,
    steps
  })
  if (!error) {
    sessionSteps.value = steps
    showEditStepDialog.value = false
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ الخطوة', life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}

async function deleteStep(idx) {
  const steps = [...sessionSteps.value]
  steps.splice(idx, 1)
  steps.forEach((s, i) => { s.order = i + 1 })

  const { error } = await contentStore.upsertRecord('session_patterns', {
    id: currentPatternId.value,
    steps
  })
  if (!error) {
    sessionSteps.value = steps
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حذف الخطوة', life: 3000 })
  }
}

// ===== Activity fold & edit =====
function toggleAct(id) { expandedAct.value = expandedAct.value === id ? null : id }

function openEditAct(dsa) {
  const act = dsa.activities || {}
  editActForm.value = {
    id: act.id,
    name: dsa.custom_name || act.name || '',
    description: dsa.custom_description || act.description || '',
    activity_type: act.activity_type || '',
    duration: dsa.custom_duration || act.duration || 8,
    steps: (dsa.custom_steps?.length ? dsa.custom_steps : act.steps || []).join('\n'),
    tools: (dsa.custom_tools?.length ? dsa.custom_tools : act.tools || []).join('، '),
    teacher_tips: (dsa.custom_tips?.length ? dsa.custom_tips : act.teacher_tips || []).join('\n'),
    _dsa_id: dsa.id,
    _is_library: !!dsa.activity_id
  }
  showEditActDialog.value = true
}

async function saveEditAct() {
  const f = editActForm.value
  const stepsArr = f.steps.split('\n').filter(s => s.trim())
  const toolsArr = f.tools.split('،').map(t => t.trim()).filter(t => t)
  const tipsArr = f.teacher_tips.split('\n').filter(t => t.trim())

  if (f._is_library && f.id) {
    // Update the library activity directly
    await contentStore.upsertRecord('activities', {
      id: f.id, name: f.name, description: f.description, activity_type: f.activity_type,
      duration: f.duration, steps: stepsArr, tools: toolsArr, teacher_tips: tipsArr
    })
  }
  // Also save customizations on the day_step_activity
  await contentStore.saveDayStepActivity({
    id: f._dsa_id,
    custom_name: f._is_library ? null : f.name,
    custom_description: f._is_library ? null : f.description,
    custom_duration: f.duration,
    custom_steps: f._is_library ? [] : stepsArr,
    custom_tools: f._is_library ? [] : toolsArr,
    custom_tips: f._is_library ? [] : tipsArr
  })

  showEditActDialog.value = false
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ التعديلات', life: 3000 })
  await loadData()
}

// ===== Activity Notes CRUD =====
function openAddNote(dsa) {
  editingNoteDsa.value = dsa
  editingNoteIdx.value = -1
  noteText.value = ''
  showNoteDialog.value = true
}

function openEditNote(dsa, idx) {
  editingNoteDsa.value = dsa
  editingNoteIdx.value = idx
  noteText.value = dsa.notes[idx]
  showNoteDialog.value = true
}

async function saveNote() {
  const dsa = editingNoteDsa.value
  const notes = [...(dsa.notes || [])]
  if (editingNoteIdx.value >= 0) {
    notes[editingNoteIdx.value] = noteText.value
  } else {
    notes.push(noteText.value)
  }
  const { error } = await contentStore.saveDayStepActivity({ id: dsa.id, notes })
  if (!error) {
    showNoteDialog.value = false
    dayStepActivities.value = await contentStore.fetchDayStepActivities(route.params.dayId)
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ الملاحظة', life: 3000 })
  }
}

async function deleteNote(dsa, idx) {
  const notes = [...(dsa.notes || [])]
  notes.splice(idx, 1)
  await contentStore.saveDayStepActivity({ id: dsa.id, notes })
  dayStepActivities.value = await contentStore.fetchDayStepActivities(route.params.dayId)
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم حذف الملاحظة', life: 3000 })
}

function getStepActivities(stepIdx) {
  return dayStepActivities.value.filter(a => a.step_index === stepIdx)
}

function getActivityDisplay(dsa) {
  // If linked to library activity, use its data; otherwise use custom fields
  if (dsa.activities) {
    return {
      name: dsa.custom_name || dsa.activities.name,
      description: dsa.custom_description || dsa.activities.description,
      steps: dsa.custom_steps?.length ? dsa.custom_steps : dsa.activities.steps,
      tools: dsa.custom_tools?.length ? dsa.custom_tools : dsa.activities.tools,
      tips: dsa.custom_tips?.length ? dsa.custom_tips : dsa.activities.teacher_tips,
      duration: dsa.custom_duration || dsa.activities.duration,
      type: dsa.activities.activity_type,
      isLibrary: true
    }
  }
  return {
    name: dsa.custom_name || 'نشاط مخصص',
    description: dsa.custom_description || '',
    steps: dsa.custom_steps || [],
    tools: dsa.custom_tools || [],
    tips: dsa.custom_tips || [],
    duration: dsa.custom_duration || 0,
    type: 'مخصص',
    isLibrary: false
  }
}

function openAssignActivity(stepIdx) {
  assignStepIdx.value = stepIdx
  assignMode.value = 'library'
  selectedActivityId.value = null
  customActivityForm.value = { custom_name: '', custom_description: '', custom_steps: '', custom_tools: '', custom_tips: '', custom_duration: 8 }
  showAssignDialog.value = true
}

async function assignActivity() {
  const currentDayId = route.params.dayId
  let payload = { day_id: currentDayId, step_index: assignStepIdx.value, sort_order: getStepActivities(assignStepIdx.value).length }

  if (assignMode.value === 'library' && selectedActivityId.value) {
    payload.activity_id = selectedActivityId.value
  } else {
    payload.custom_name = customActivityForm.value.custom_name
    payload.custom_description = customActivityForm.value.custom_description
    payload.custom_steps = customActivityForm.value.custom_steps ? customActivityForm.value.custom_steps.split('\n').filter(s => s.trim()) : []
    payload.custom_tools = customActivityForm.value.custom_tools ? customActivityForm.value.custom_tools.split('،').map(t => t.trim()).filter(t => t) : []
    payload.custom_tips = customActivityForm.value.custom_tips ? customActivityForm.value.custom_tips.split('\n').filter(t => t.trim()) : []
    payload.custom_duration = customActivityForm.value.custom_duration
  }

  const { error } = await contentStore.saveDayStepActivity(payload)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم إضافة النشاط', life: 3000 })
    showAssignDialog.value = false
    dayStepActivities.value = await contentStore.fetchDayStepActivities(currentDayId)
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}

async function removeStepActivity(dsaId) {
  const { error } = await contentStore.deleteDayStepActivity(dsaId)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم إزالة النشاط', life: 3000 })
    dayStepActivities.value = await contentStore.fetchDayStepActivities(route.params.dayId)
  }
}
</script>

<template>
  <div class="day-view" v-if="level">
    <QuickNav />
    <Breadcrumb :model="breadcrumbItems" :home="breadcrumbHome" class="day-breadcrumb" />

    <!-- Day Header -->
    <div class="day-header animate__animated animate__fadeIn" :style="{ '--lc': level.color }">
      <div class="day-header-content">
        <div>
          <Tag v-if="dayCompleted" severity="success" value="مكتمل" class="completed-tag" />
          <h1>{{ level.name }} - {{ weekData?.title || 'الأسبوع ' + weekNumber }}</h1>
          <p>{{ dayData?.title || 'سيناريو اليوم' }} - 45 دقيقة</p>
          <p v-if="currentLetter">العنصر الأساسي: <strong style="font-size: 1.5rem">{{ currentLetter }}</strong></p>
        </div>
        <div class="header-actions">
          <Button v-if="authStore.isAdmin" icon="pi pi-pencil" label="تعديل اليوم" class="edit-btn" @click="openEditDay" />
          <Button v-if="authStore.isAdmin && !dayCompleted" label="تحديد كمكتمل" icon="pi pi-check-circle" class="complete-btn" @click="showCompleteDialog = true" />
        </div>
      </div>
    </div>

    <!-- Day Objectives & Summary -->
    <div v-if="dayData?.objectives?.length || dayData?.summary" class="custom-card no-hover animate__animated animate__fadeInUp obj-card">
      <h2><i class="pi pi-flag" :style="{ color: level.color }"></i> هدف اليوم وملخصه</h2>
      <div v-if="dayData?.summary" class="day-summary">
        <p>{{ dayData.summary }}</p>
      </div>
      <div v-if="dayData?.objectives?.length" class="day-objectives">
        <strong>الأهداف:</strong>
        <ul>
          <li v-for="(obj, i) in dayData.objectives" :key="i">
            <i class="pi pi-check-circle" :style="{ color: level.color }"></i>
            {{ obj }}
          </li>
        </ul>
      </div>
      <div v-if="dayData?.teacher_notes" class="teacher-notes-box">
        <i class="pi pi-lightbulb" style="color: #FFD43B"></i>
        <span>{{ dayData.teacher_notes }}</span>
      </div>
    </div>

    <!-- Day Scenario Timeline -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <div class="section-header-row">
        <h2><i class="pi pi-list-check" :style="{ color: level.color }"></i> سيناريو اليوم (الجدول الزمني)</h2>
        <Button v-if="authStore.isAdmin" label="إضافة خطوة" icon="pi pi-plus" size="small" @click="openAddStep" />
      </div>

      <div v-if="sessionSteps.length" class="day-timeline">
        <div v-for="(step, idx) in sessionSteps" :key="idx" class="timeline-item stagger-item" :style="{ animationDelay: `${idx * 0.1}s` }">
          <div class="timeline-top-row">
            <span class="time-label">{{ step.duration }} دقيقة</span>
            <div v-if="authStore.isAdmin" class="step-actions">
              <Button icon="pi pi-pencil" text rounded size="small" v-tooltip.top="'تعديل'" @click="openEditStep(step, idx)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" v-tooltip.top="'حذف'" @click="deleteStep(idx)" />
            </div>
          </div>
          <div class="timeline-step-header">
            <span class="timeline-step-num" :style="{ background: level.color }">{{ step.order }}</span>
            <i :class="step.icon" :style="{ color: level.color, fontSize: '1.1rem' }"></i>
            <h3>{{ step.name }}</h3>
          </div>

          <p v-if="step.description" class="step-description">{{ step.description }}</p>

          <!-- Assigned Activities for this step -->
          <div class="timeline-step-details">
            <div v-if="getStepActivities(idx).length" class="assigned-activities">
              <div v-for="dsa in getStepActivities(idx)" :key="dsa.id" class="assigned-act-card" :class="{ expanded: expandedAct === dsa.id }">
                <!-- Foldable Header -->
                <div class="assigned-act-header" @click="toggleAct(dsa.id)">
                  <div class="act-title-row">
                    <i :class="expandedAct === dsa.id ? 'pi pi-chevron-down' : 'pi pi-chevron-left'" class="fold-icon"></i>
                    <strong>{{ getActivityDisplay(dsa).name }}</strong>
                    <Tag :value="getActivityDisplay(dsa).type" size="small" :style="{ background: level.color + '15', color: level.color }" />
                    <Tag v-if="getActivityDisplay(dsa).isLibrary" value="من المكتبة" size="small" severity="info" />
                    <span class="act-dur-badge"><i class="pi pi-clock"></i> {{ getActivityDisplay(dsa).duration }} د</span>
                  </div>
                  <div class="act-header-btns" @click.stop>
                    <Button v-if="authStore.isAdmin" icon="pi pi-pencil" text rounded size="small" v-tooltip.top="'تعديل النشاط'" @click="openEditAct(dsa)" />
                    <Button v-if="authStore.isAdmin" icon="pi pi-times" text rounded size="small" severity="danger" v-tooltip.top="'إزالة'" @click="removeStepActivity(dsa.id)" />
                  </div>
                </div>

                <!-- Collapsed preview -->
                <p v-if="expandedAct !== dsa.id && getActivityDisplay(dsa).description" class="act-preview-text">{{ getActivityDisplay(dsa).description }}</p>

                <!-- Expanded body -->
                <div v-if="expandedAct === dsa.id" class="act-expanded-body">
                  <p v-if="getActivityDisplay(dsa).description" class="act-full-desc">{{ getActivityDisplay(dsa).description }}</p>
                  <div v-if="getActivityDisplay(dsa).steps?.length" class="mini-steps-list">
                    <strong><i class="pi pi-list-check" :style="{color: level.color}"></i> خطوات التنفيذ:</strong>
                    <ol><li v-for="(s, si) in getActivityDisplay(dsa).steps" :key="si">{{ s }}</li></ol>
                  </div>
                  <div v-if="getActivityDisplay(dsa).tools?.length" class="mini-tools-section">
                    <strong><i class="pi pi-wrench" style="color:#339AF0"></i> الأدوات:</strong>
                    <div class="mini-tools">
                      <span v-for="tool in getActivityDisplay(dsa).tools" :key="tool" class="tool-chip"><i class="pi pi-wrench"></i> {{ tool }}</span>
                    </div>
                  </div>
                  <div v-if="getActivityDisplay(dsa).tips?.length" class="mini-tips-section">
                    <strong><i class="pi pi-lightbulb" style="color:#FFD43B"></i> نصائح للمعلمة:</strong>
                    <div class="mini-tips">
                      <span v-for="(t, ti) in getActivityDisplay(dsa).tips" :key="ti" class="mini-tip">💡 {{ t }}</span>
                    </div>
                  </div>

                  <!-- Day-specific Notes -->
                <div class="activity-notes-section">
                  <div class="notes-header">
                    <strong><i class="pi pi-bookmark" style="color: #845EF7"></i> ملاحظات خاصة بهذا اليوم</strong>
                    <Button v-if="authStore.isAdmin" icon="pi pi-plus" label="إضافة ملاحظة" text size="small" @click="openAddNote(dsa)" />
                  </div>
                  <div v-if="dsa.notes?.length" class="notes-list">
                    <div v-for="(note, ni) in dsa.notes" :key="ni" class="note-item">
                      <i class="pi pi-comment" style="color: #845EF7; flex-shrink:0; margin-top:3px"></i>
                      <span>{{ note }}</span>
                      <div v-if="authStore.isAdmin" class="note-actions">
                        <Button icon="pi pi-pencil" text rounded size="small" @click="openEditNote(dsa, ni)" />
                        <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteNote(dsa, ni)" />
                      </div>
                    </div>
                  </div>
                  <p v-else class="no-notes">لا توجد ملاحظات لهذا النشاط</p>
                </div>
                </div><!-- /act-expanded-body -->
              </div>
            </div>
            <Button v-if="authStore.isAdmin" label="إضافة نشاط لهذه الخطوة" icon="pi pi-plus" text size="small" :style="{ color: level.color }" @click="openAssignActivity(idx)" class="add-step-act-btn" />
          </div>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 30px">
        <i class="pi pi-clock"></i>
        <h3>لم يتم تحميل نمط الحصة</h3>
        <p>يرجى المحاولة مرة أخرى</p>
      </div>
    </div>

    <!-- Tips -->
    <div class="custom-card no-hover tips-card animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-lightbulb" style="color: var(--warning-color)"></i> نصائح للمعلمة</h2>
      <div class="tips-grid">
        <div class="tip-item"><i class="pi pi-heart" style="color: #FF6B6B"></i><p>ابدئي دائماً بتحية حارة وابتسامة</p></div>
        <div class="tip-item"><i class="pi pi-volume-up" style="color: #339AF0"></i><p>استخدمي الفصحى المبسطة طوال الحصة</p></div>
        <div class="tip-item"><i class="pi pi-users" style="color: #51CF66"></i><p>أشركي جميع الأطفال ولا تتجاهلي أحداً</p></div>
        <div class="tip-item"><i class="pi pi-star" style="color: #FFD43B"></i><p>شجّعي كل محاولة ولو كانت بسيطة</p></div>
      </div>
    </div>

    <!-- Comments -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="margin-top: 20px;">
      <h2><i class="pi pi-comments" :style="{ color: level.color }"></i> التعليقات والملاحظات</h2>
      <div class="comment-form">
        <Textarea v-model="newComment" placeholder="أضف تعليقاً أو ملاحظة..." rows="3" class="w-full" />
        <Button label="إضافة تعليق" icon="pi pi-send" :style="{ background: level.color, borderColor: level.color }" @click="submitComment" :disabled="!newComment.trim()" />
      </div>
      <div class="comments-list" v-if="comments.length">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <strong>{{ comment.profiles?.full_name || 'مستخدم' }}</strong>
            <Tag :value="comment.profiles?.role === 'admin' ? 'مدير' : 'معلمة'" :severity="comment.profiles?.role === 'admin' ? 'warn' : 'info'" />
            <span class="comment-date">{{ new Date(comment.created_at).toLocaleDateString('ar-EG') }}</span>
          </div>
          <p>{{ comment.content }}</p>
        </div>
      </div>
      <div v-else class="empty-state" style="padding: 30px"><i class="pi pi-comments"></i><p>لا توجد تعليقات بعد</p></div>
    </div>

    <!-- Complete Dialog -->
    <Dialog v-model:visible="showCompleteDialog" header="تحديد اليوم كمكتمل" :style="{ width: '450px' }" modal>
      <p>هل تريد تحديد هذا اليوم كمكتمل؟</p>
      <Textarea v-model="completionNotes" placeholder="أضف ملاحظات نهائية (اختياري)..." rows="4" class="w-full" style="margin-top: 12px" />
      <template #footer>
        <Button label="إلغاء" text @click="showCompleteDialog = false" />
        <Button label="تأكيد الإكمال" icon="pi pi-check" @click="markComplete" />
      </template>
    </Dialog>

    <!-- Edit Day Dialog -->
    <Dialog v-model:visible="showEditDayDialog" header="تعديل بيانات اليوم" :style="{ width: '550px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>عنوان اليوم</label>
          <InputText v-model="editDayForm.title" class="w-full" />
        </div>
        <div class="form-field">
          <label>ملخص اليوم</label>
          <Textarea v-model="editDayForm.summary" rows="3" class="w-full" />
        </div>
        <div class="form-field">
          <label>الأهداف (كل هدف في سطر)</label>
          <Textarea v-model="editDayForm.objectives" rows="4" class="w-full" placeholder="هدف 1&#10;هدف 2&#10;هدف 3" />
        </div>
        <div class="form-field">
          <label>ملاحظات للمعلمة</label>
          <Textarea v-model="editDayForm.teacher_notes" rows="3" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showEditDayDialog = false" />
        <Button label="حفظ" icon="pi pi-check" @click="saveDay" />
      </template>
    </Dialog>

    <!-- Assign Activity to Step Dialog -->
    <Dialog v-model:visible="showAssignDialog" header="إضافة نشاط للخطوة" :style="{ width: '600px' }" modal>
      <div class="dialog-form">
        <div class="assign-mode-toggle">
          <Button :label="'اختيار من المكتبة'" :outlined="assignMode !== 'library'" @click="assignMode = 'library'" />
          <Button :label="'نشاط مخصص'" :outlined="assignMode !== 'custom'" @click="assignMode = 'custom'" />
        </div>

        <!-- Library mode -->
        <div v-if="assignMode === 'library'" class="library-picker">
          <Dropdown
            v-model="selectedActivityId"
            :options="allActivitiesList"
            optionLabel="name"
            optionValue="id"
            placeholder="اختر نشاط من المكتبة"
            class="w-full"
            filter
            filterPlaceholder="ابحث..."
          >
            <template #option="{ option }">
              <div class="lib-option">
                <strong>{{ option.name }}</strong>
                <span class="lib-opt-meta">{{ option.category }} - {{ option.duration }} د</span>
              </div>
            </template>
          </Dropdown>
          <div v-if="selectedActivityId" class="preview-selected">
            <p class="preview-label">معاينة النشاط المختار:</p>
            <div class="preview-card">
              <strong>{{ allActivitiesList.find(a => a.id === selectedActivityId)?.name }}</strong>
              <p>{{ allActivitiesList.find(a => a.id === selectedActivityId)?.description }}</p>
            </div>
          </div>
        </div>

        <!-- Custom mode -->
        <div v-else class="custom-form">
          <div class="form-field"><label>اسم النشاط</label><InputText v-model="customActivityForm.custom_name" class="w-full" /></div>
          <div class="form-field"><label>الوصف</label><Textarea v-model="customActivityForm.custom_description" rows="2" class="w-full" /></div>
          <div class="form-field"><label>المدة (دقيقة)</label><InputText v-model.number="customActivityForm.custom_duration" type="number" class="w-full" /></div>
          <div class="form-field"><label>الخطوات (كل خطوة في سطر)</label><Textarea v-model="customActivityForm.custom_steps" rows="4" class="w-full" /></div>
          <div class="form-field"><label>الأدوات (مفصولة بفاصلة ،)</label><InputText v-model="customActivityForm.custom_tools" class="w-full" /></div>
          <div class="form-field"><label>نصائح (كل نصيحة في سطر)</label><Textarea v-model="customActivityForm.custom_tips" rows="3" class="w-full" /></div>
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showAssignDialog = false" />
        <Button label="إضافة" icon="pi pi-check" @click="assignActivity" :disabled="assignMode === 'library' && !selectedActivityId" />
      </template>
    </Dialog>

    <!-- Edit Activity Dialog -->
    <Dialog v-model:visible="showEditActDialog" header="تعديل النشاط" :style="{ width: '600px' }" modal>
      <div class="dialog-form" v-if="editActForm">
        <Tag v-if="editActForm._is_library" value="التعديل سيُحفظ في مكتبة الأنشطة" severity="info" style="margin-bottom:8px" />
        <div class="form-row">
          <div class="form-field"><label>اسم النشاط</label><InputText v-model="editActForm.name" class="w-full" /></div>
          <div class="form-field"><label>النوع</label><InputText v-model="editActForm.activity_type" class="w-full" /></div>
        </div>
        <div class="form-field"><label>الوصف</label><Textarea v-model="editActForm.description" rows="2" class="w-full" /></div>
        <div class="form-field"><label>المدة (دقيقة)</label><InputText v-model.number="editActForm.duration" type="number" class="w-full" /></div>
        <div class="form-field"><label>خطوات التنفيذ (كل خطوة في سطر)</label><Textarea v-model="editActForm.steps" rows="5" class="w-full" /></div>
        <div class="form-field"><label>الأدوات (مفصولة بفاصلة ،)</label><InputText v-model="editActForm.tools" class="w-full" /></div>
        <div class="form-field"><label>نصائح للمعلمة (كل نصيحة في سطر)</label><Textarea v-model="editActForm.teacher_tips" rows="4" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showEditActDialog = false" />
        <Button label="حفظ" icon="pi pi-check" @click="saveEditAct" />
      </template>
    </Dialog>

    <!-- Note Dialog -->
    <Dialog v-model:visible="showNoteDialog" :header="editingNoteIdx >= 0 ? 'تعديل ملاحظة' : 'إضافة ملاحظة'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>الملاحظة</label>
          <Textarea v-model="noteText" rows="4" class="w-full" placeholder="اكتب ملاحظة خاصة بهذا النشاط في هذا اليوم..." />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showNoteDialog = false" />
        <Button :label="editingNoteIdx >= 0 ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveNote" :disabled="!noteText.trim()" />
      </template>
    </Dialog>

    <!-- Edit/Add Step Dialog -->
    <Dialog v-model:visible="showEditStepDialog" :header="editingStepIdx >= 0 ? 'تعديل خطوة' : 'إضافة خطوة جديدة'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>اسم الخطوة</label>
          <InputText v-model="stepForm.name" class="w-full" placeholder="مثال: قراءة القصة" />
        </div>
        <div class="form-field">
          <label>الوصف</label>
          <Textarea v-model="stepForm.description" rows="3" class="w-full" placeholder="وصف تفصيلي لما يتم في هذه الخطوة" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>المدة (دقيقة)</label>
            <InputText v-model.number="stepForm.duration" type="number" class="w-full" />
          </div>
          <div class="form-field">
            <label>الأيقونة</label>
            <IconPicker v-model="stepForm.icon" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showEditStepDialog = false" />
        <Button :label="editingStepIdx >= 0 ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveStep" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.day-breadcrumb { margin-bottom: 20px; background: transparent; border: none; padding: 0; }
.day-header { background: linear-gradient(135deg, var(--lc), color-mix(in srgb, var(--lc) 70%, black)); border-radius: 20px; padding: 28px 32px; color: white; margin-bottom: 24px; }
.day-header-content { display: flex; justify-content: space-between; align-items: flex-start; }
.day-header h1 { color: white; font-size: 1.4rem; margin-bottom: 4px; }
.day-header p { opacity: 0.9; }
.header-actions { display: flex; gap: 8px; flex-direction: column; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-header-row h2 { margin-bottom: 0; }
.timeline-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.step-actions { display: flex; gap: 2px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.assigned-activities { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }
.assigned-act-card { padding: 12px; background: white; border-radius: 10px; border: 1px solid var(--border-color); border-right: 3px solid var(--primary-color); transition: all 0.2s; }
.assigned-act-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.act-title-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1; }
.fold-icon { font-size: 0.7rem; color: var(--text-muted); transition: transform 0.2s; }
.act-dur-badge { font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 3px; }
.act-header-btns { display: flex; gap: 2px; flex-shrink: 0; }
.act-preview-text { font-size: 0.8rem; color: var(--text-muted); margin: 6px 0 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.act-expanded-body { padding-top: 10px; margin-top: 8px; border-top: 1px solid var(--border-color); }
.act-full-desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 10px; line-height: 1.7; }
.mini-steps-list strong, .mini-tools-section strong, .mini-tips-section strong { font-size: 0.83rem; display: flex; align-items: center; gap: 5px; margin-bottom: 6px; }
.mini-tools-section, .mini-tips-section { margin-top: 8px; }
.mini-steps-list ol { padding-right: 18px; margin: 0 0 6px; }
.mini-steps-list li { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.7; }
.mini-tips { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; }
.mini-tip { font-size: 0.78rem; color: var(--text-muted); }
.add-step-act-btn { margin-top: 4px; }
.activity-notes-section { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color); }
.notes-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.notes-header strong { font-size: 0.85rem; display: flex; align-items: center; gap: 6px; color: #845EF7; }
.notes-list { display: flex; flex-direction: column; gap: 6px; }
.note-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: #F3F0FF; border-radius: 8px; font-size: 0.83rem; color: var(--text-secondary); line-height: 1.7; }
.note-item span { flex: 1; }
.note-actions { display: flex; gap: 1px; flex-shrink: 0; }
.no-notes { font-size: 0.8rem; color: var(--text-muted); margin: 0; font-style: italic; }
.assign-mode-toggle { display: flex; gap: 8px; margin-bottom: 16px; }
.library-picker { display: flex; flex-direction: column; gap: 12px; }
.lib-option { display: flex; flex-direction: column; }
.lib-opt-meta { font-size: 0.78rem; color: var(--text-muted); }
.preview-selected { margin-top: 8px; }
.preview-label { font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; }
.preview-card { padding: 10px; background: var(--bg-color); border-radius: 8px; }
.preview-card strong { font-size: 0.9rem; }
.preview-card p { font-size: 0.82rem; color: var(--text-secondary); margin: 4px 0 0; }
.custom-form { display: flex; flex-direction: column; gap: 12px; }
.edit-btn, .complete-btn { background: rgba(255,255,255,0.2) !important; border: 1px solid rgba(255,255,255,0.4) !important; color: white !important; }
h2 { font-size: 1.15rem; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
.obj-card { border-right: 4px solid var(--primary-color); }
.day-summary { background: var(--bg-color); padding: 14px; border-radius: 10px; margin-bottom: 14px; }
.day-summary p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.8; margin: 0; }
.day-objectives ul { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 8px; }
.day-objectives li { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-secondary); }
.day-objectives strong { font-size: 0.9rem; color: var(--text-primary); }
.teacher-notes-box { margin-top: 14px; padding: 12px; background: #FFFDE7; border-radius: 10px; display: flex; align-items: flex-start; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.7; }
.timeline-step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.timeline-step-header h3 { font-size: 1rem; }
.timeline-step-num { width: 30px; height: 30px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
.step-description { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; line-height: 1.6; padding-right: 40px; }
.timeline-step-details { margin-right: 40px; }
.detail-box { background: var(--bg-color); border-radius: 10px; padding: 14px; }
.detail-title { margin-bottom: 8px; font-size: 0.85rem; }
.suggested-activities { display: flex; flex-direction: column; gap: 10px; }
.mini-activity { padding: 10px; background: white; border-radius: 8px; border: 1px solid var(--border-color); }
.mini-act-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.mini-activity strong { font-size: 0.85rem; }
.mini-activity p { font-size: 0.8rem; color: var(--text-secondary); margin: 4px 0 6px; }
.mini-steps { display: flex; flex-direction: column; gap: 2px; }
.mini-step { font-size: 0.75rem; color: var(--text-muted); }
.mini-tools { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.tool-chip { font-size: 0.7rem; background: var(--bg-color); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary); display: flex; align-items: center; gap: 3px; }
.tips-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.tip-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: var(--bg-color); border-radius: 10px; }
.tip-item i { margin-top: 3px; flex-shrink: 0; }
.tip-item p { font-size: 0.9rem; margin: 0; color: var(--text-secondary); }
.comment-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.w-full { width: 100%; }
.comments-list { display: flex; flex-direction: column; gap: 12px; }
.comment-item { padding: 14px; background: var(--bg-color); border-radius: 10px; }
.comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.comment-date { font-size: 0.8rem; color: var(--text-muted); margin-right: auto; }
.comment-item p { font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.7; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
@media (max-width: 768px) {
  .day-header-content { flex-direction: column; }
  .header-actions { flex-direction: row; margin-top: 12px; }
  .timeline-step-details { margin-right: 0; }
  .tips-grid { grid-template-columns: 1fr; }
}
</style>
