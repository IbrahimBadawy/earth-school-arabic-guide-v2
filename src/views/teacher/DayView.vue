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
import QuickNav from '@/components/common/QuickNav.vue'
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
const showEditDayDialog = ref(false)
const editDayForm = ref({})

const weekNumber = computed(() => weekData.value?.week_number || '')

const breadcrumbItems = computed(() => [
  { label: 'الرئيسية', command: () => router.push('/') },
  { label: level.value?.name, command: () => router.push(`/level/${levelId.value}`) },
  { label: weekData.value?.title || `الأسبوع ${weekNumber.value}`, command: () => router.push(`/level/${levelId.value}/week/${weekId.value}`) },
  { label: dayData.value?.title || 'اليوم' }
])
const breadcrumbHome = { icon: 'pi pi-home', command: () => router.push('/') }

const currentLetter = computed(() => {
  if (levelId.value === 1 && weekData.value?.letter) return weekData.value.letter
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
    // For level 3, use the first pattern by default (alternate between days)
    const dayNum = dayData.value?.day_number || 1
    if (currentLevelId === 3 && patterns.length > 1) {
      sessionSteps.value = patterns[dayNum === 1 ? 0 : 1]?.steps || patterns[0]?.steps || []
    } else {
      sessionSteps.value = patterns[0]?.steps || []
    }
  }

  // Fetch activities for suggestions
  const acts = await contentStore.fetchActivities(currentLevelId)
  const grouped = {}
  ;(acts || []).forEach(a => {
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(a)
  })
  activities.value = grouped

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

function getActivitiesForStep(stepName) {
  if (!stepName) return []
  const allActs = Object.values(activities.value).flat()
  // Match step name to relevant activities
  if (stepName.includes('صوتي')) return allActs.filter(a => a.category === 'الوعي الصوتي').slice(0, 2)
  if (stepName.includes('بصري')) return allActs.filter(a => a.category === 'الوعي البصري' || a.category === 'القراءة').slice(0, 2)
  if (stepName.includes('فني') || stepName.includes('خطوط')) return allActs.filter(a => a.category === 'ما قبل الكتابة' || a.category === 'الكتابة').slice(0, 2)
  if (stepName.includes('كتابة') || stepName.includes('إبداعية')) return allActs.filter(a => a.category === 'الكتابة').slice(0, 2)
  if (stepName.includes('دمج')) return allActs.filter(a => a.category === 'القراءة').slice(0, 2)
  if (stepName.includes('لغوي')) return allActs.filter(a => a.category === 'اللغويات' || a.category === 'القراءة').slice(0, 2)
  return []
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
          <p v-if="currentLetter">حرف اليوم: <strong style="font-size: 1.5rem">{{ currentLetter }}</strong></p>
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
      <h2><i class="pi pi-list-check" :style="{ color: level.color }"></i> سيناريو اليوم (الجدول الزمني)</h2>

      <div v-if="sessionSteps.length" class="day-timeline">
        <div v-for="(step, idx) in sessionSteps" :key="idx" class="timeline-item stagger-item" :style="{ animationDelay: `${idx * 0.1}s` }">
          <span class="time-label">{{ step.duration }} دقيقة</span>
          <div class="timeline-step-header">
            <span class="timeline-step-num" :style="{ background: level.color }">{{ step.order }}</span>
            <i :class="step.icon" :style="{ color: level.color, fontSize: '1.1rem' }"></i>
            <h3>{{ step.name }}</h3>
          </div>

          <p v-if="step.description" class="step-description">{{ step.description }}</p>

          <!-- Suggested Activities for this step -->
          <div v-if="getActivitiesForStep(step.name).length" class="timeline-step-details">
            <div class="detail-box">
              <p class="detail-title"><strong>الأنشطة المقترحة:</strong></p>
              <div class="suggested-activities">
                <div v-for="act in getActivitiesForStep(step.name)" :key="act.id" class="mini-activity">
                  <div class="mini-act-header">
                    <strong>{{ act.name }}</strong>
                    <Tag :value="act.activity_type" size="small" :style="{ background: level.color + '15', color: level.color }" />
                  </div>
                  <p>{{ act.description }}</p>
                  <div v-if="act.steps?.length" class="mini-steps">
                    <span v-for="(s, si) in act.steps.slice(0, 3)" :key="si" class="mini-step">{{ s }}</span>
                  </div>
                  <div v-if="act.tools?.length" class="mini-tools">
                    <span v-for="tool in act.tools" :key="tool" class="tool-chip"><i class="pi pi-wrench"></i> {{ tool }}</span>
                  </div>
                </div>
              </div>
            </div>
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
  </div>
</template>

<style scoped>
.day-breadcrumb { margin-bottom: 20px; background: transparent; border: none; padding: 0; }
.day-header { background: linear-gradient(135deg, var(--lc), color-mix(in srgb, var(--lc) 70%, black)); border-radius: 20px; padding: 28px 32px; color: white; margin-bottom: 24px; }
.day-header-content { display: flex; justify-content: space-between; align-items: flex-start; }
.day-header h1 { color: white; font-size: 1.4rem; margin-bottom: 4px; }
.day-header p { opacity: 0.9; }
.header-actions { display: flex; gap: 8px; flex-direction: column; }
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
