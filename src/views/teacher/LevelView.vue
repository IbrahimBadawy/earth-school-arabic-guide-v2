<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '@/stores/content'
import { useAuthStore } from '@/stores/auth'
import QuickNav from '@/components/common/QuickNav.vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const router = useRouter()
const contentStore = useContentStore()
const authStore = useAuthStore()
const toast = useToast()

const levelId = computed(() => Number(route.params.levelId))
const level = computed(() => contentStore.getLevelData(levelId.value))

const axes = ref([])
const activities = ref({})
const patterns = ref([])
const weeks = ref([])
const showActivityDialog = ref(false)
const editingActivity = ref(null)
const expandedActivity = ref(null)
const editMode = ref(false)
const showAxisDialog = ref(false)
const axisForm = ref({})
const showObjDialog = ref(false)
const objForm = ref({})
const showPatternStepDialog = ref(false)
const patternStepForm = ref({})
const editingPatternId = ref(null)
const editingStepIdx = ref(-1)

watch(() => route.params.levelId, async () => {
  const lid = Number(route.params.levelId)
  if (!lid) return
  // Fetch all data in parallel
  const [axesData, actsData, patsData, weeksData] = await Promise.all([
    contentStore.fetchLevelAxes(lid),
    contentStore.fetchActivities(lid),
    contentStore.fetchSessionPatterns(lid),
    contentStore.fetchWeeks(lid)
  ])

  axes.value = axesData || []

  // Group activities by category
  const grouped = {}
  ;(actsData || []).forEach(a => {
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(a)
  })
  activities.value = grouped

  patterns.value = patsData || []
  weeks.value = weeksData || []
}, { immediate: true })

function navigateToWeek(weekId) {
  router.push(`/level/${levelId.value}/week/${weekId}`)
}

const sessionSteps = computed(() => {
  if (!patterns.value.length) return []
  if (levelId.value === 3) return patterns.value[0]?.steps || []
  return patterns.value[0]?.steps || []
})

function toggleExpand(id) {
  expandedActivity.value = expandedActivity.value === id ? null : id
}

function openAddActivity() {
  editMode.value = false
  editingActivity.value = { level_id: levelId.value, category: '', name: '', description: '', activity_type: '', duration: 8, steps: '', tools: '', teacher_tips: '', sort_order: 0, differentiation: { advanced: '', struggling: '' } }
  showActivityDialog.value = true
}

function openEditActivity(activity) {
  editMode.value = true
  editingActivity.value = {
    ...activity,
    steps: (activity.steps || []).join('\n'),
    tools: (activity.tools || []).join('، '),
    teacher_tips: (activity.teacher_tips || []).join('\n'),
    differentiation: activity.differentiation || { advanced: '', struggling: '' }
  }
  showActivityDialog.value = true
}

async function reloadActivities() {
  const actsData = await contentStore.fetchActivities(levelId.value)
  const grouped = {}
  ;(actsData || []).forEach(a => {
    if (!grouped[a.category]) grouped[a.category] = []
    grouped[a.category].push(a)
  })
  activities.value = grouped
}

async function saveActivity() {
  const payload = {
    ...editingActivity.value,
    steps: typeof editingActivity.value.steps === 'string' ? editingActivity.value.steps.split('\n').filter(s => s.trim()) : editingActivity.value.steps,
    tools: typeof editingActivity.value.tools === 'string' ? editingActivity.value.tools.split('،').map(t => t.trim()).filter(t => t) : editingActivity.value.tools,
    teacher_tips: typeof editingActivity.value.teacher_tips === 'string' ? editingActivity.value.teacher_tips.split('\n').filter(t => t.trim()) : editingActivity.value.teacher_tips
  }
  const { error } = await contentStore.upsertRecord('activities', payload)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حفظ النشاط', life: 3000 })
    showActivityDialog.value = false
    await reloadActivities()
  } else {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
  }
}

async function deleteActivity(id) {
  const { error } = await contentStore.deleteRecord('activities', id)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم حذف النشاط', life: 3000 })
    await reloadActivities()
  }
}

// ===== Axes CRUD =====
async function reloadAxes() { axes.value = await contentStore.fetchLevelAxes(levelId.value) || [] }
function openAddAxis() { editMode.value = false; axisForm.value = { level_id: levelId.value, name: '', description: '', sort_order: axes.value.length + 1 }; showAxisDialog.value = true }
function openEditAxis(axis) { editMode.value = true; axisForm.value = { ...axis }; delete axisForm.value.axis_objectives; showAxisDialog.value = true }
async function saveAxis() {
  const { error } = await contentStore.upsertRecord('level_axes', axisForm.value)
  if (!error) { showAxisDialog.value = false; await reloadAxes(); toast.add({ severity: 'success', summary: 'تم', life: 3000 }) }
}
async function deleteAxis(id) { await contentStore.deleteRecord('level_axes', id); await reloadAxes(); toast.add({ severity: 'success', summary: 'تم حذف المحور', life: 3000 }) }

// Objective CRUD (under axis)
function openAddObj(axisId) { editMode.value = false; objForm.value = { axis_id: axisId, objective_text: '', sort_order: 0 }; showObjDialog.value = true }
function openEditObj(obj) { editMode.value = true; objForm.value = { ...obj }; showObjDialog.value = true }
async function saveObj() {
  const { error } = await contentStore.upsertRecord('axis_objectives', objForm.value)
  if (!error) { showObjDialog.value = false; await reloadAxes(); toast.add({ severity: 'success', summary: 'تم', life: 3000 }) }
}
async function deleteObj(id) { await contentStore.deleteRecord('axis_objectives', id); await reloadAxes() }

// ===== Session Pattern Steps CRUD =====
function openAddPatternStep(patternId) {
  editingPatternId.value = patternId
  editingStepIdx.value = -1
  const pat = patterns.value.find(p => p.id === patternId)
  patternStepForm.value = { order: (pat?.steps?.length || 0) + 1, name: '', duration: 8, icon: 'pi pi-star', description: '' }
  showPatternStepDialog.value = true
}
function openEditPatternStep(patternId, step, idx) {
  editingPatternId.value = patternId
  editingStepIdx.value = idx
  patternStepForm.value = { ...step }
  showPatternStepDialog.value = true
}
async function savePatternStep() {
  const pat = patterns.value.find(p => p.id === editingPatternId.value)
  if (!pat) return
  const steps = [...(pat.steps || [])]
  if (editingStepIdx.value >= 0) { steps[editingStepIdx.value] = { ...patternStepForm.value } }
  else { steps.push({ ...patternStepForm.value }) }
  steps.forEach((s, i) => { s.order = i + 1 })
  const { error } = await contentStore.upsertRecord('session_patterns', { id: pat.id, steps })
  if (!error) {
    pat.steps = steps
    showPatternStepDialog.value = false
    toast.add({ severity: 'success', summary: 'تم', life: 3000 })
  }
}
async function deletePatternStep(patternId, idx) {
  const pat = patterns.value.find(p => p.id === patternId)
  if (!pat) return
  const steps = [...(pat.steps || [])]
  steps.splice(idx, 1)
  steps.forEach((s, i) => { s.order = i + 1 })
  await contentStore.upsertRecord('session_patterns', { id: pat.id, steps })
  pat.steps = steps
  toast.add({ severity: 'success', summary: 'تم حذف الخطوة', life: 3000 })
}
</script>

<template>
  <div class="level-view" v-if="level">
    <QuickNav />
    <!-- Level Header -->
    <div class="level-header animate__animated animate__fadeIn" :style="{ '--lc': level.color }">
      <div class="level-header-content">
        <div class="level-icon-big" :style="{ background: level.color + '20' }">
          <i :class="level.icon" :style="{ color: level.color, fontSize: '2rem' }"></i>
        </div>
        <div>
          <h1>{{ level.name }}</h1>
          <p>{{ level.age_range }} - {{ level.students_count }} طفل</p>
          <p class="level-desc-text">{{ level.description }}</p>
        </div>
      </div>
    </div>

    <!-- Letters (Level 1 only) -->
    <div v-if="levelId === 1 && level.letters" class="letters-section custom-card no-hover animate__animated animate__fadeInUp">
      <h2><i class="pi pi-bookmark" :style="{ color: level.color }"></i> الحروف المقررة (حرف كل أسبوع)</h2>
      <div class="letters-grid">
        <div v-for="(letter, idx) in level.letters" :key="idx" class="letter-item stagger-item"
             :style="{ animationDelay: `${idx * 0.05}s`, '--lc': level.color }">
          <span class="letter-char">{{ letter }}</span>
          <span class="letter-week">أسبوع {{ idx + 1 }}</span>
        </div>
      </div>
    </div>

    <!-- Axes / Objectives from DB -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.1s">
      <div class="section-header-row">
        <h2><i class="pi pi-flag" :style="{ color: level.color }"></i> المحاور الأساسية والأهداف</h2>
        <Button v-if="authStore.isAdmin" label="إضافة محور" icon="pi pi-plus" size="small" @click="openAddAxis" />
      </div>
      <Accordion v-if="axes.length">
        <AccordionPanel v-for="axis in axes" :key="axis.id" :value="String(axis.id)">
          <AccordionHeader>
            <span class="axis-header">
              <Tag :style="{ background: level.color + '20', color: level.color }" :value="axis.name" />
              <span style="margin-right: 8px">{{ axis.description }}</span>
              <span v-if="authStore.isAdmin" class="axis-actions" @click.stop>
                <Button icon="pi pi-pencil" text rounded size="small" @click.stop="openEditAxis(axis)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click.stop="deleteAxis(axis.id)" />
              </span>
            </span>
          </AccordionHeader>
          <AccordionContent>
            <ul v-if="axis.axis_objectives?.length" class="sub-items-list">
              <li v-for="obj in axis.axis_objectives" :key="obj.id">
                <i class="pi pi-check-circle" :style="{ color: level.color }"></i>
                <span style="flex:1">{{ obj.objective_text }}</span>
                <span v-if="authStore.isAdmin" class="obj-actions">
                  <Button icon="pi pi-pencil" text rounded size="small" @click="openEditObj(obj)" />
                  <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteObj(obj.id)" />
                </span>
              </li>
            </ul>
            <Button v-if="authStore.isAdmin" label="إضافة هدف" icon="pi pi-plus" text size="small" @click="openAddObj(axis.id)" />
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>

    <!-- Session Pattern from DB -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.2s; margin-top: 20px;">
      <h2><i class="pi pi-clock" :style="{ color: level.color }"></i> نمط الحصة</h2>

      <!-- Level 3 with multiple patterns -->
      <div v-if="levelId === 3 && patterns.length > 1" class="patterns-grid">
        <div v-for="pattern in patterns" :key="pattern.id" class="pattern-card">
          <div class="pattern-card-header">
            <h3 :style="{ color: level.color }">{{ pattern.pattern_name }}</h3>
            <Button v-if="authStore.isAdmin" icon="pi pi-plus" label="خطوة" text size="small" @click="openAddPatternStep(pattern.id)" />
          </div>
          <div class="session-timeline">
            <div v-for="(step, idx) in pattern.steps" :key="idx" class="session-step" :style="{ '--step-color': level.color }">
              <div class="step-number">{{ step.order }}</div>
              <div class="step-content">
                <div class="step-header">
                  <i :class="step.icon" :style="{ color: level.color }"></i>
                  <strong>{{ step.name }}</strong>
                </div>
                <Tag severity="info" :value="`${step.duration} دقيقة`" />
              </div>
              <div v-if="authStore.isAdmin" class="step-edit-actions">
                <Button icon="pi pi-pencil" text rounded size="small" @click="openEditPatternStep(pattern.id, step, idx)" />
                <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deletePatternStep(pattern.id, idx)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Level 1 & 2 single pattern -->
      <div v-else>
        <div v-if="authStore.isAdmin && patterns[0]" style="margin-bottom:10px">
          <Button icon="pi pi-plus" label="إضافة خطوة" text size="small" @click="openAddPatternStep(patterns[0].id)" />
        </div>
        <div class="session-timeline">
          <div v-for="(step, idx) in sessionSteps" :key="idx" class="session-step stagger-item"
               :style="{ animationDelay: `${idx * 0.1}s`, '--step-color': level.color }">
            <div class="step-number">{{ step.order }}</div>
            <div class="step-content">
              <div class="step-header">
                <i :class="step.icon" :style="{ color: level.color }"></i>
                <strong>{{ step.name }}</strong>
              </div>
              <p v-if="step.description" class="step-desc">{{ step.description }}</p>
              <Tag severity="info" :value="`${step.duration} دقيقة`" />
            </div>
            <div v-if="authStore.isAdmin && patterns[0]" class="step-edit-actions">
              <Button icon="pi pi-pencil" text rounded size="small" @click="openEditPatternStep(patterns[0].id, step, idx)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deletePatternStep(patterns[0].id, idx)" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Activities from DB - Foldable -->
    <div class="custom-card no-hover animate__animated animate__fadeInUp" style="animation-delay: 0.3s; margin-top: 20px;">
      <div class="section-header-row">
        <h2><i class="pi pi-palette" :style="{ color: level.color }"></i> الأنشطة</h2>
        <Button v-if="authStore.isAdmin" label="إضافة نشاط" icon="pi pi-plus" size="small" @click="openAddActivity" />
      </div>
      <div v-for="(catActivities, category) in activities" :key="category" class="activity-category">
        <h3 class="category-title">
          <span class="category-badge" :style="{ background: level.color + '20', color: level.color }">{{ category }}</span>
          <Tag :value="`${catActivities.length}`" severity="secondary" />
        </h3>
        <div class="activities-list-fold">
          <div v-for="activity in catActivities" :key="activity.id" class="activity-fold-card"
               :class="{ expanded: expandedActivity === activity.id }" :style="{ '--ac': level.color }">
            <!-- Collapsed Header -->
            <div class="fold-header" @click="toggleExpand(activity.id)">
              <div class="fold-title">
                <h4>{{ activity.name }}</h4>
                <div class="fold-tags">
                  <Tag :value="activity.activity_type" :style="{ background: level.color + '15', color: level.color }" />
                  <span class="act-dur"><i class="pi pi-clock"></i> {{ activity.duration }} د</span>
                </div>
              </div>
              <div class="fold-actions">
                <Button v-if="authStore.isAdmin" icon="pi pi-pencil" text rounded size="small" @click.stop="openEditActivity(activity)" />
                <Button v-if="authStore.isAdmin" icon="pi pi-trash" text rounded size="small" severity="danger" @click.stop="deleteActivity(activity.id)" />
                <i :class="expandedActivity === activity.id ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" style="color: var(--text-muted)"></i>
              </div>
            </div>
            <!-- Collapsed preview -->
            <p v-if="expandedActivity !== activity.id" class="fold-preview">{{ activity.description }}</p>
            <!-- Expanded Body -->
            <div v-if="expandedActivity === activity.id" class="fold-body animate__animated animate__fadeIn">
              <p class="fold-desc">{{ activity.description }}</p>
              <div v-if="activity.steps?.length" class="fold-section">
                <strong><i class="pi pi-list-check" :style="{ color: level.color }"></i> خطوات التنفيذ:</strong>
                <ol><li v-for="(s, i) in activity.steps" :key="i">{{ s }}</li></ol>
              </div>
              <div v-if="activity.tools?.length" class="fold-section">
                <strong><i class="pi pi-wrench" style="color:#339AF0"></i> الأدوات:</strong>
                <div class="fold-tools"><span v-for="t in activity.tools" :key="t" class="tool-chip-sm">{{ t }}</span></div>
              </div>
              <div v-if="activity.teacher_tips?.length" class="fold-section tips-box">
                <strong><i class="pi pi-lightbulb" style="color:#FFD43B"></i> نصائح للمعلمة:</strong>
                <ul><li v-for="(t, i) in activity.teacher_tips" :key="i">{{ t }}</li></ul>
              </div>
              <div v-if="activity.differentiation && (activity.differentiation.advanced || activity.differentiation.struggling)" class="fold-section">
                <strong><i class="pi pi-sliders-h" style="color:#845EF7"></i> التمايز:</strong>
                <div class="diff-row">
                  <div v-if="activity.differentiation.advanced" class="diff-box adv"><Tag value="للمتقدمين" severity="success" /><span>{{ activity.differentiation.advanced }}</span></div>
                  <div v-if="activity.differentiation.struggling" class="diff-box str"><Tag value="لمن يحتاج دعماً" severity="warn" /><span>{{ activity.differentiation.struggling }}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Weeks Grid -->
    <h2 class="section-title" style="margin-top: 32px;">
      <i class="pi pi-calendar" :style="{ color: level.color }"></i> الأسابيع التعليمية
    </h2>
    <div class="weeks-grid">
      <div v-for="(week, idx) in weeks" :key="week.id" class="week-card custom-card stagger-item"
           :style="{ animationDelay: `${idx * 0.06}s`, '--wc': level.color }" @click="navigateToWeek(week.id)">
        <div class="week-number-badge" :style="{ background: level.color }">{{ week.week_number }}</div>
        <div class="week-info">
          <h4>{{ week.title || `الأسبوع ${week.week_number}` }}</h4>
          <p v-if="week.letter && levelId === 1">حرف: <strong class="week-letter">{{ week.letter }}</strong></p>
        </div>
        <div class="week-status">
          <i class="pi pi-chevron-left" :style="{ color: level.color }"></i>
        </div>
      </div>
    </div>

    <!-- Edit Activity Dialog (Full) -->
    <Dialog v-model:visible="showActivityDialog" :header="editMode ? 'تعديل نشاط' : 'إضافة نشاط جديد'" :style="{ width: '650px' }" modal>
      <div class="dialog-form" v-if="editingActivity">
        <div class="form-row">
          <div class="form-field"><label>التصنيف</label><InputText v-model="editingActivity.category" class="w-full" placeholder="مثال: الوعي الصوتي" /></div>
          <div class="form-field"><label>النوع</label><InputText v-model="editingActivity.activity_type" class="w-full" placeholder="حركي / بصري..." /></div>
        </div>
        <div class="form-field"><label>اسم النشاط</label><InputText v-model="editingActivity.name" class="w-full" /></div>
        <div class="form-field"><label>الوصف</label><Textarea v-model="editingActivity.description" rows="2" class="w-full" /></div>
        <div class="form-field"><label>المدة (دقيقة)</label><InputText v-model.number="editingActivity.duration" type="number" class="w-full" /></div>
        <div class="form-field"><label>خطوات التنفيذ (كل خطوة في سطر)</label><Textarea v-model="editingActivity.steps" rows="5" class="w-full" /></div>
        <div class="form-field"><label>الأدوات (مفصولة بفاصلة ،)</label><InputText v-model="editingActivity.tools" class="w-full" /></div>
        <div class="form-field"><label>نصائح للمعلمة (كل نصيحة في سطر)</label><Textarea v-model="editingActivity.teacher_tips" rows="4" class="w-full" /></div>
        <div class="form-row">
          <div class="form-field"><label>تعديلات للمتقدمين</label><InputText v-model="editingActivity.differentiation.advanced" class="w-full" /></div>
          <div class="form-field"><label>تعديلات لمن يحتاج دعماً</label><InputText v-model="editingActivity.differentiation.struggling" class="w-full" /></div>
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showActivityDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveActivity" />
      </template>
    </Dialog>

    <!-- Axis Dialog -->
    <Dialog v-model:visible="showAxisDialog" :header="editMode ? 'تعديل محور' : 'إضافة محور'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>اسم المحور</label><InputText v-model="axisForm.name" class="w-full" placeholder="مثال: الوعي الصوتي" /></div>
        <div class="form-field"><label>الوصف</label><Textarea v-model="axisForm.description" rows="3" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showAxisDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveAxis" />
      </template>
    </Dialog>

    <!-- Objective Dialog -->
    <Dialog v-model:visible="showObjDialog" :header="editMode ? 'تعديل هدف' : 'إضافة هدف'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>نص الهدف</label><Textarea v-model="objForm.objective_text" rows="3" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showObjDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveObj" />
      </template>
    </Dialog>

    <!-- Pattern Step Dialog -->
    <Dialog v-model:visible="showPatternStepDialog" :header="editingStepIdx >= 0 ? 'تعديل خطوة' : 'إضافة خطوة'" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>اسم الخطوة</label><InputText v-model="patternStepForm.name" class="w-full" /></div>
        <div class="form-field"><label>الوصف</label><Textarea v-model="patternStepForm.description" rows="2" class="w-full" /></div>
        <div class="form-row">
          <div class="form-field"><label>المدة (دقيقة)</label><InputText v-model.number="patternStepForm.duration" type="number" class="w-full" /></div>
          <div class="form-field"><label>الأيقونة</label><InputText v-model="patternStepForm.icon" class="w-full" placeholder="pi pi-book" /></div>
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showPatternStepDialog = false" />
        <Button :label="editingStepIdx >= 0 ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="savePatternStep" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.level-header {
  background: linear-gradient(135deg, var(--lc), color-mix(in srgb, var(--lc) 70%, black));
  border-radius: 20px;
  padding: 32px;
  color: white;
  margin-bottom: 28px;
}
.level-header-content { display: flex; align-items: center; gap: 20px; }
.level-icon-big {
  width: 72px; height: 72px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.2) !important; flex-shrink: 0;
}
.level-icon-big i { color: white !important; }
.level-header h1 { color: white; font-size: 1.5rem; margin-bottom: 4px; }
.level-header p { opacity: 0.9; }
.level-desc-text { font-size: 0.9rem; margin-top: 4px; }
.letters-section { margin-bottom: 20px; }
.letters-section h2, h2 { font-size: 1.2rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.letters-grid { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.letter-item {
  width: 80px; height: 90px; border-radius: 14px; border: 2px solid var(--border-color);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  transition: all 0.3s ease;
}
.letter-item:hover { border-color: var(--lc); transform: scale(1.08); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.letter-char { font-size: 2rem; font-weight: 800; color: var(--text-primary); }
.letter-week { font-size: 0.7rem; color: var(--text-muted); }
.axis-header { display: flex; align-items: center; gap: 8px; }
.sub-items-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.sub-items-list li { display: flex; align-items: flex-start; gap: 8px; font-size: 0.9rem; line-height: 1.7; }
.session-timeline { display: flex; flex-direction: column; gap: 12px; }
.session-step {
  display: flex; align-items: flex-start; gap: 14px; padding: 12px;
  background: var(--bg-color); border-radius: 12px; transition: transform 0.2s;
}
.session-step:hover { transform: translateX(-4px); }
.step-number {
  width: 36px; height: 36px; border-radius: 50%; background: var(--step-color); color: white;
  display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0;
}
.step-content { flex: 1; }
.step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.step-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 4px 0 6px; }
.patterns-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.pattern-card { padding: 20px; background: var(--bg-color); border-radius: 14px; }
.pattern-card h3 { margin-bottom: 16px; font-size: 1.1rem; }
.activity-category { margin-bottom: 24px; }
.category-title { margin-bottom: 12px; }
.category-badge { padding: 4px 16px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; }
.activities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.activity-card { padding: 16px; background: var(--bg-color); border-radius: 12px; border: 1px solid var(--border-color); }
.activity-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.activity-header h4 { font-size: 0.95rem; }
.activity-card > p { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; line-height: 1.7; }
.activity-steps { margin-bottom: 12px; }
.activity-steps strong { font-size: 0.85rem; color: var(--primary-dark); display: block; margin-bottom: 6px; }
.activity-steps ol { padding-right: 20px; margin: 0; }
.activity-steps li { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.8; padding: 2px 0; }
.activity-tips { margin-bottom: 12px; background: #FFFDE7; padding: 10px; border-radius: 8px; }
.activity-tips strong { font-size: 0.85rem; display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
.activity-tips ul { list-style: none; padding: 0; margin: 0; }
.activity-tips li { font-size: 0.82rem; color: var(--text-secondary); padding: 2px 0; line-height: 1.7; }
.activity-tips li::before { content: '💡 '; }
.activity-meta { display: flex; flex-direction: column; gap: 8px; }
.meta-item { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
.tools-list { display: flex; flex-wrap: wrap; gap: 6px; }
.tool-tag { font-size: 0.75rem; background: white; padding: 2px 8px; border-radius: 6px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.differentiation { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.diff-item { display: flex; align-items: flex-start; gap: 8px; font-size: 0.8rem; color: var(--text-secondary); }
.weeks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.week-card { display: flex; align-items: center; gap: 14px; cursor: pointer; padding: 16px; }
.week-number-badge {
  width: 44px; height: 44px; border-radius: 12px; color: white;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0;
}
.week-info { flex: 1; }
.week-info h4 { font-size: 0.95rem; margin-bottom: 2px; }
.week-info p { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }
.week-letter { font-size: 1.1rem; color: var(--wc); }
.week-status { flex-shrink: 0; }
.section-title { font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
.w-full { width: 100%; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header-row h2 { margin-bottom: 0; }
.axis-actions, .obj-actions { display: flex; gap: 2px; flex-shrink: 0; margin-right: auto; }
.axis-header { display: flex; align-items: center; gap: 8px; width: 100%; }
.step-edit-actions { display: flex; gap: 2px; flex-shrink: 0; }
.pattern-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-header-row h2 { margin-bottom: 0; }
.activities-list-fold { display: flex; flex-direction: column; gap: 10px; }
.activity-fold-card { padding: 14px 16px; background: var(--bg-color); border-radius: 12px; border: 1px solid var(--border-color); border-right: 4px solid var(--ac); transition: all 0.2s; }
.fold-header { display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; }
.fold-title h4 { font-size: 0.95rem; margin-bottom: 4px; }
.fold-tags { display: flex; gap: 6px; align-items: center; }
.act-dur { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 3px; }
.fold-actions { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.fold-preview { font-size: 0.82rem; color: var(--text-muted); margin: 6px 0 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.fold-body { padding-top: 12px; border-top: 1px solid var(--border-color); margin-top: 10px; }
.fold-desc { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.8; margin-bottom: 12px; }
.fold-section { margin-bottom: 12px; }
.fold-section strong { font-size: 0.88rem; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.fold-section ol { padding-right: 20px; margin: 0; }
.fold-section ol li { font-size: 0.85rem; color: var(--text-secondary); line-height: 1.9; }
.fold-section ul { list-style: none; padding: 0; margin: 0; }
.fold-section ul li { font-size: 0.85rem; color: var(--text-secondary); padding: 2px 0; line-height: 1.7; }
.fold-section ul li::before { content: '💡 '; }
.fold-tools { display: flex; flex-wrap: wrap; gap: 6px; }
.tool-chip-sm { background: white; padding: 3px 10px; border-radius: 6px; font-size: 0.78rem; color: var(--text-secondary); border: 1px solid var(--border-color); }
.tips-box { background: #FFFDE7; padding: 10px; border-radius: 8px; }
.diff-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.diff-box { padding: 10px; border-radius: 8px; }
.diff-box.adv { background: #E8F5E9; }
.diff-box.str { background: #FFF3E0; }
.diff-box span { font-size: 0.82rem; color: var(--text-secondary); display: block; margin-top: 4px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 768px) {
  .level-header-content { flex-direction: column; text-align: center; }
  .activities-grid, .patterns-grid { grid-template-columns: 1fr; }
  .weeks-grid { grid-template-columns: 1fr; }
}
</style>
