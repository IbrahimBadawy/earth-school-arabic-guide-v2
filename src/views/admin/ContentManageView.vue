<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useContentStore } from '@/stores/content'
import IconPicker from '@/components/common/IconPicker.vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import Tag from 'primevue/tag'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()

const weeks = ref([])
const contentStore = useContentStore()
const loading = ref(false)
const showWeekDialog = ref(false)
const showDayDialog = ref(false)
const showLevelDialog = ref(false)
const editMode = ref(false)
const selectedLevel = ref(1)

const weekForm = ref({ level_id: 1, week_number: 1, title: '', focus_item: '', notes: '' })
const dayForm = ref({ week_id: null, day_number: 1, title: '', summary: '', objectives: '', teacher_notes: '' })
const levelForm = ref({ name: '', age_range: '', students_count: 0, color: '#4CAF93', icon: 'pi pi-star', description: '', letters: '' })

const levels = computed(() => contentStore.levelsData || [])
const levelColors = computed(() => {
  const map = {}
  levels.value.forEach(l => { map[l.id] = l.color })
  return map
})

onMounted(async () => {
  await contentStore.fetchUnits()
  await contentStore.fetchLevels()
  if (levels.value.length) selectedLevel.value = levels.value[0].id
  fetchAll()
})

async function fetchAll() {
  loading.value = true
  let query = supabase
    .from('weeks')
    .select('*, days(id, day_number, title, is_completed, summary, objectives, teacher_notes)')
    .order('level_id').order('week_number')
  if (contentStore.activeUnit?.id) {
    query = query.eq('unit_id', contentStore.activeUnit.id)
  }
  if (contentStore.activeSubject?.id) {
    query = query.eq('subject_id', contentStore.activeSubject.id)
  }
  const { data } = await query
  weeks.value = (data || []).map(w => ({
    ...w,
    days: (w.days || []).sort((a, b) => a.day_number - b.day_number)
  }))
  loading.value = false
}

const filteredWeeks = computed(() => weeks.value.filter(w => w.level_id === selectedLevel.value))

const stats = computed(() => {
  const lvlWeeks = filteredWeeks.value
  const totalDays = lvlWeeks.reduce((s, w) => s + (w.days?.length || 0), 0)
  const completed = lvlWeeks.reduce((s, w) => s + (w.days?.filter(d => d.is_completed).length || 0), 0)
  return { weeks: lvlWeeks.length, days: totalDays, completed }
})

// Week CRUD
function openAddWeek() {
  editMode.value = false
  const maxNum = Math.max(0, ...filteredWeeks.value.map(w => w.week_number))
  weekForm.value = { level_id: selectedLevel.value, week_number: maxNum + 1, title: `الأسبوع ${maxNum + 1}`, focus_item: '', notes: '' }
  showWeekDialog.value = true
}

function openEditWeek(week) {
  editMode.value = true
  weekForm.value = { id: week.id, level_id: week.level_id, week_number: week.week_number, title: week.title || '', focus_item: week.focus_item || '', notes: week.notes || '' }
  showWeekDialog.value = true
}

async function saveWeek() {
  const payload = { ...weekForm.value }
  if (!editMode.value && contentStore.activeUnit?.id) {
    payload.unit_id = contentStore.activeUnit.id
  }
  if (editMode.value) {
    await supabase.from('weeks').update(payload).eq('id', payload.id)
  } else {
    delete payload.id
    await supabase.from('weeks').insert(payload)
  }
  toast.add({ severity: 'success', summary: 'تم', life: 3000 })
  showWeekDialog.value = false
  await fetchAll()
}

function confirmDeleteWeek(week) {
  confirm.require({
    message: `حذف "${week.title}" سيحذف جميع الأيام والأنشطة المرتبطة. متأكد؟`,
    header: 'تأكيد الحذف',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'حذف',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await supabase.from('weeks').delete().eq('id', week.id)
      toast.add({ severity: 'success', summary: 'تم الحذف', life: 3000 })
      await fetchAll()
    }
  })
}

// Day CRUD
function openAddDay(weekId) {
  editMode.value = false
  const week = weeks.value.find(w => w.id === weekId)
  const maxDay = Math.max(0, ...(week?.days || []).map(d => d.day_number))
  dayForm.value = { week_id: weekId, day_number: maxDay + 1, title: `اليوم ${maxDay + 1 === 1 ? 'الأول' : 'الثاني'}`, summary: '', objectives: '', teacher_notes: '' }
  showDayDialog.value = true
}

function openEditDay(day) {
  editMode.value = true
  dayForm.value = { id: day.id, week_id: day.week_id, day_number: day.day_number, title: day.title || '', summary: day.summary || '', objectives: (day.objectives || []).join('\n'), teacher_notes: day.teacher_notes || '' }
  showDayDialog.value = true
}

async function saveDay() {
  const payload = { ...dayForm.value, objectives: dayForm.value.objectives ? dayForm.value.objectives.split('\n').filter(o => o.trim()) : [] }
  if (editMode.value) {
    await supabase.from('days').update(payload).eq('id', payload.id)
  } else {
    delete payload.id
    await supabase.from('days').insert(payload)
  }
  toast.add({ severity: 'success', summary: 'تم', life: 3000 })
  showDayDialog.value = false
  await fetchAll()
}

function confirmDeleteDay(day) {
  confirm.require({
    message: `حذف "${day.title}" سيحذف جميع الأنشطة والتعليقات المرتبطة. متأكد؟`,
    header: 'تأكيد الحذف',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'حذف',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await supabase.from('days').delete().eq('id', day.id)
      toast.add({ severity: 'success', summary: 'تم الحذف', life: 3000 })
      await fetchAll()
    }
  })
}

async function toggleDayComplete(day) {
  await supabase.from('days').update({ is_completed: !day.is_completed }).eq('id', day.id)
  await fetchAll()
}

async function generateWeeksForLevel() {
  const letters = ['ا', 'ب', 'ح', 'د', 'ر', 'س', 'ش', 'ع', 'ف', 'ك', 'ل', 'م']
  const inserts = []
  for (let w = 1; w <= 12; w++) {
    const weekData = {
      level_id: selectedLevel.value,
      week_number: w,
      title: `الأسبوع ${w}`,
      focus_item: selectedLevel.value === 1 ? (letters[w - 1] || '') : ''
    }
    if (contentStore.activeUnit?.id) weekData.unit_id = contentStore.activeUnit.id
    if (contentStore.activeSubject?.id) weekData.subject_id = contentStore.activeSubject.id
    inserts.push(weekData)
  }
  const { data: newWeeks } = await supabase.from('weeks').upsert(inserts, { onConflict: 'level_id,week_number' }).select('id')
  if (newWeeks) {
    const dayInserts = []
    for (const week of newWeeks) {
      dayInserts.push(
        { week_id: week.id, day_number: 1, title: 'اليوم الأول' },
        { week_id: week.id, day_number: 2, title: 'اليوم الثاني' }
      )
    }
    await supabase.from('days').upsert(dayInserts, { onConflict: 'week_id,day_number' })
  }
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم إنشاء 12 أسبوع + 24 يوم', life: 3000 })
  await fetchAll()
}

// Level CRUD
function openAddLevel() {
  editMode.value = false
  levelForm.value = { name: '', age_range: '', students_count: 0, color: '#4CAF93', icon: 'pi pi-star', description: '', letters: '', sort_order: levels.value.length + 1 }
  showLevelDialog.value = true
}

function openEditLevel(lvl) {
  editMode.value = true
  levelForm.value = { ...lvl, letters: (lvl.letters || []).join('، ') }
  showLevelDialog.value = true
}

async function saveLevel() {
  const payload = { ...levelForm.value, letters: levelForm.value.letters ? levelForm.value.letters.split('،').map(l => l.trim()).filter(l => l) : [] }
  if (editMode.value && payload.id) {
    await supabase.from('levels').update(payload).eq('id', payload.id)
  } else {
    delete payload.id
    await supabase.from('levels').insert(payload)
  }
  toast.add({ severity: 'success', summary: 'تم', life: 3000 })
  showLevelDialog.value = false
  await contentStore.reloadLevels()
}

function confirmDeleteLevel(lvl) {
  confirm.require({
    message: `حذف "${lvl.name}" سيحذف جميع الأسابيع والأيام والأنشطة والتقييمات المرتبطة. هذا إجراء لا يمكن التراجع عنه!`,
    header: 'تأكيد حذف المستوى',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'حذف نهائي',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      // Delete related data first
      const { data: lvlWeeks } = await supabase.from('weeks').select('id').eq('level_id', lvl.id)
      if (lvlWeeks?.length) {
        const weekIds = lvlWeeks.map(w => w.id)
        await supabase.from('days').delete().in('week_id', weekIds)
        await supabase.from('weeks').delete().eq('level_id', lvl.id)
      }
      await supabase.from('activities').delete().eq('level_id', lvl.id)
      await supabase.from('assessment_items').delete().eq('level_id', lvl.id)
      await supabase.from('level_axes').delete().eq('level_id', lvl.id)
      await supabase.from('session_patterns').delete().eq('level_id', lvl.id)
      await supabase.from('levels').delete().eq('id', lvl.id)
      toast.add({ severity: 'success', summary: 'تم حذف المستوى', life: 3000 })
      await contentStore.reloadLevels()
      if (selectedLevel.value === lvl.id && levels.value.length) selectedLevel.value = levels.value[0].id
      await fetchAll()
    }
  })
}
</script>

<template>
  <div class="content-manage">
    <!-- Active Unit Info -->
    <div v-if="contentStore.activeUnit" class="active-unit-bar">
      <i class="pi pi-folder"></i>
      <span>الوحدة النشطة: <strong>{{ contentStore.activeUnit.name }}</strong></span>
      <Tag v-if="contentStore.activeUnit.year" :value="contentStore.activeUnit.year" severity="info" />
    </div>

    <div class="page-header">
      <div class="header-row">
        <div>
          <h1><i class="pi pi-cog" style="color: #FF9F43"></i> إدارة الأسابيع والأيام</h1>
          <p>إضافة وتعديل وحذف الأسابيع والأيام لكل مستوى</p>
        </div>
        <div class="header-btns">
          <Button label="إنشاء 12 أسبوع تلقائي" icon="pi pi-bolt" severity="warn" size="small" @click="generateWeeksForLevel" />
          <Button label="إضافة أسبوع" icon="pi pi-plus" size="small" @click="openAddWeek" />
        </div>
      </div>
    </div>

    <!-- Levels Management -->
    <div class="levels-section custom-card no-hover" style="margin-bottom:20px">
      <div class="section-header-row">
        <h2><i class="pi pi-th-large" style="color: #845EF7"></i> المستويات</h2>
        <Button label="إضافة مستوى" icon="pi pi-plus" size="small" @click="openAddLevel" />
      </div>
      <div class="level-tabs">
        <div v-for="lvl in levels" :key="lvl.id" class="level-tab-card" :class="{ active: selectedLevel === lvl.id }" :style="{ '--tc': lvl.color }" @click="selectedLevel = lvl.id">
          <div class="ltc-content">
            <i :class="lvl.icon" :style="{ color: lvl.color }"></i>
            <div>
              <strong>{{ lvl.name }}</strong>
              <span>{{ lvl.age_range }} - {{ lvl.students_count }} طفل</span>
            </div>
          </div>
          <div class="ltc-actions" @click.stop>
            <Button icon="pi pi-pencil" text rounded size="small" @click="openEditLevel(lvl)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDeleteLevel(lvl)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="level-stats">
      <Tag :value="`${stats.weeks} أسبوع`" severity="info" />
      <Tag :value="`${stats.days} يوم`" />
      <Tag :value="`${stats.completed} مكتمل`" severity="success" />
    </div>

    <!-- Weeks List -->
    <div class="weeks-list">
      <div v-for="week in filteredWeeks" :key="week.id" class="week-block custom-card no-hover">
        <div class="week-block-header">
          <div class="week-title-area">
            <span class="week-num" :style="{ background: levelColors[selectedLevel] }">{{ week.week_number }}</span>
            <div>
              <h3>{{ week.title }}</h3>
              <span v-if="week.focus_item" class="week-letter-tag">العنصر الأساسي: {{ week.focus_item }}</span>
            </div>
          </div>
          <div class="week-actions">
            <Button icon="pi pi-plus" label="يوم" text size="small" @click="openAddDay(week.id)" />
            <Button icon="pi pi-pencil" text rounded size="small" @click="openEditWeek(week)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDeleteWeek(week)" />
          </div>
        </div>

        <!-- Days -->
        <div v-if="week.days?.length" class="days-list">
          <div v-for="day in week.days" :key="day.id" class="day-row">
            <div class="day-row-right">
              <Button :icon="day.is_completed ? 'pi pi-check-circle' : 'pi pi-circle'" text rounded size="small" :style="{ color: day.is_completed ? '#51CF66' : 'var(--text-muted)' }" @click="toggleDayComplete(day)" />
              <div>
                <strong>{{ day.title || 'يوم ' + day.day_number }}</strong>
                <p v-if="day.summary" class="day-summary-preview">{{ day.summary.substring(0, 60) }}...</p>
              </div>
            </div>
            <div class="day-row-actions">
              <Tag v-if="day.objectives?.length" :value="`${day.objectives.length} أهداف`" severity="secondary" />
              <Button icon="pi pi-pencil" text rounded size="small" @click="openEditDay(day)" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDeleteDay(day)" />
            </div>
          </div>
        </div>
        <div v-else class="empty-days">
          <span>لا توجد أيام</span>
          <Button label="إضافة يوم" icon="pi pi-plus" text size="small" @click="openAddDay(week.id)" />
        </div>
      </div>

      <div v-if="!filteredWeeks.length" class="empty-state" style="padding:40px">
        <i class="pi pi-calendar"></i>
        <h3>لا توجد أسابيع لهذا المستوى</h3>
        <Button label="إنشاء 12 أسبوع تلقائياً" icon="pi pi-bolt" @click="generateWeeksForLevel" />
      </div>
    </div>

    <!-- Week Dialog -->
    <Dialog v-model:visible="showWeekDialog" :header="editMode ? 'تعديل أسبوع' : 'إضافة أسبوع'" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <div class="form-row">
          <div class="form-field"><label>رقم الأسبوع</label><InputText v-model.number="weekForm.week_number" type="number" class="w-full" /></div>
          <div class="form-field"><label>العنصر الأساسي</label><InputText v-model="weekForm.focus_item" class="w-full" /></div>
        </div>
        <div class="form-field"><label>العنوان</label><InputText v-model="weekForm.title" class="w-full" /></div>
        <div class="form-field"><label>ملاحظات</label><Textarea v-model="weekForm.notes" rows="2" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showWeekDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveWeek" />
      </template>
    </Dialog>

    <!-- Day Dialog -->
    <Dialog v-model:visible="showDayDialog" :header="editMode ? 'تعديل يوم' : 'إضافة يوم'" :style="{ width: '550px' }" modal>
      <div class="dialog-form">
        <div class="form-row">
          <div class="form-field"><label>رقم اليوم</label><InputText v-model.number="dayForm.day_number" type="number" class="w-full" /></div>
          <div class="form-field"><label>العنوان</label><InputText v-model="dayForm.title" class="w-full" /></div>
        </div>
        <div class="form-field"><label>ملخص اليوم</label><Textarea v-model="dayForm.summary" rows="3" class="w-full" /></div>
        <div class="form-field"><label>الأهداف (كل هدف في سطر)</label><Textarea v-model="dayForm.objectives" rows="4" class="w-full" placeholder="هدف 1&#10;هدف 2&#10;هدف 3" /></div>
        <div class="form-field"><label>ملاحظات للمعلمة</label><Textarea v-model="dayForm.teacher_notes" rows="2" class="w-full" /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showDayDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveDay" />
      </template>
    </Dialog>

    <!-- Level Dialog -->
    <Dialog v-model:visible="showLevelDialog" :header="editMode ? 'تعديل مستوى' : 'إضافة مستوى جديد'" :style="{ width: '550px' }" modal>
      <div class="dialog-form">
        <div class="form-field"><label>اسم المستوى</label><InputText v-model="levelForm.name" class="w-full" placeholder="مثال: المستوى الأول" /></div>
        <div class="form-row">
          <div class="form-field"><label>الفئة العمرية</label><InputText v-model="levelForm.age_range" class="w-full" placeholder="3-4 سنوات" /></div>
          <div class="form-field"><label>عدد الأطفال</label><InputText v-model.number="levelForm.students_count" type="number" class="w-full" /></div>
        </div>
        <div class="form-field"><label>الوصف</label><Textarea v-model="levelForm.description" rows="3" class="w-full" /></div>
        <div class="form-row">
          <div class="form-field"><label>اللون</label><InputText v-model="levelForm.color" type="color" class="w-full" style="height:40px" /></div>
          <div class="form-field"><label>الأيقونة</label><IconPicker v-model="levelForm.icon" /></div>
        </div>
        <div class="form-field"><label>الحروف (مفصولة بفاصلة ، - للمستوى الأول فقط)</label><InputText v-model="levelForm.letters" class="w-full" placeholder="ا، ب، ح، د، ر..." /></div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showLevelDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveLevel" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.active-unit-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: linear-gradient(135deg, #d3f9d8, #b2f2bb); border: 1px solid #69db7c; border-radius: 10px; margin-bottom: 16px; font-size: 0.9rem; }
.active-unit-bar i { color: #2b8a3e; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header-row h2 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 1.1rem; }
.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.header-btns { display: flex; gap: 8px; }
.level-tabs { display: flex; flex-wrap: wrap; gap: 10px; }
.level-tab-card { border: 2px solid var(--border-color); background: white; border-radius: 12px; padding: 10px 16px; cursor: pointer; transition: all 0.15s; display: flex; justify-content: space-between; align-items: center; gap: 10px; min-width: 200px; flex: 1; }
.level-tab-card:hover { border-color: var(--tc); }
.level-tab-card.active { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 8%, white); }
.ltc-content { display: flex; align-items: center; gap: 10px; }
.ltc-content i { font-size: 1.2rem; }
.ltc-content strong { display: block; font-size: 0.9rem; }
.ltc-content span { font-size: 0.75rem; color: var(--text-muted); }
.ltc-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s; }
.level-tab-card:hover .ltc-actions { opacity: 1; }
.level-tab:hover { border-color: var(--tc); color: var(--tc); }
.level-tab.active { background: var(--tc); color: white; border-color: var(--tc); }
.level-stats { display: flex; gap: 8px; margin-bottom: 20px; }
.weeks-list { display: flex; flex-direction: column; gap: 14px; }
.week-block { padding: 16px; }
.week-block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.week-title-area { display: flex; align-items: center; gap: 12px; }
.week-num { width: 40px; height: 40px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
.week-title-area h3 { font-size: 1rem; margin: 0; }
.week-letter-tag { font-size: 0.8rem; color: var(--text-muted); }
.week-actions { display: flex; gap: 4px; align-items: center; }
.days-list { display: flex; flex-direction: column; gap: 6px; padding-right: 52px; }
.day-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-color); border-radius: 8px; }
.day-row-right { display: flex; align-items: center; gap: 8px; }
.day-row-right strong { font-size: 0.9rem; }
.day-summary-preview { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }
.day-row-actions { display: flex; gap: 4px; align-items: center; }
.empty-days { text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.85rem; display: flex; align-items: center; gap: 8px; justify-content: center; }
.dialog-form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label { font-size: 0.9rem; font-weight: 600; }
.w-full { width: 100%; }
@media (max-width: 768px) {
  .header-row { flex-direction: column; gap: 12px; }
  .level-tabs { flex-wrap: wrap; }
  .days-list { padding-right: 0; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
