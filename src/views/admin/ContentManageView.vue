<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
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
const loading = ref(false)
const showWeekDialog = ref(false)
const showDayDialog = ref(false)
const editMode = ref(false)
const selectedLevel = ref(1)

const weekForm = ref({ level_id: 1, week_number: 1, title: '', letter: '', notes: '' })
const dayForm = ref({ week_id: null, day_number: 1, title: '', summary: '', objectives: '', teacher_notes: '' })

const levelOptions = [
  { label: 'المستوى الأول (3-4 سنوات)', value: 1 },
  { label: 'المستوى الثاني (4-5 سنوات)', value: 2 },
  { label: 'المستوى الثالث (5-6 سنوات)', value: 3 }
]

const levelColors = { 1: '#4CAF93', 2: '#FF9F43', 3: '#6C63FF' }

onMounted(() => fetchAll())

async function fetchAll() {
  loading.value = true
  const { data } = await supabase
    .from('weeks')
    .select('*, days(id, day_number, title, is_completed, summary, objectives, teacher_notes)')
    .order('level_id').order('week_number')
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
  weekForm.value = { level_id: selectedLevel.value, week_number: maxNum + 1, title: `الأسبوع ${maxNum + 1}`, letter: '', notes: '' }
  showWeekDialog.value = true
}

function openEditWeek(week) {
  editMode.value = true
  weekForm.value = { id: week.id, level_id: week.level_id, week_number: week.week_number, title: week.title || '', letter: week.letter || '', notes: week.notes || '' }
  showWeekDialog.value = true
}

async function saveWeek() {
  const payload = { ...weekForm.value }
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
    inserts.push({
      level_id: selectedLevel.value,
      week_number: w,
      title: `الأسبوع ${w}`,
      letter: selectedLevel.value === 1 ? (letters[w - 1] || '') : ''
    })
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
</script>

<template>
  <div class="content-manage">
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

    <!-- Level Tabs -->
    <div class="level-tabs">
      <button v-for="lvl in levelOptions" :key="lvl.value" class="level-tab" :class="{ active: selectedLevel === lvl.value }" :style="{ '--tc': levelColors[lvl.value] }" @click="selectedLevel = lvl.value">
        {{ lvl.label }}
      </button>
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
              <span v-if="week.letter" class="week-letter-tag">حرف: {{ week.letter }}</span>
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
          <div class="form-field"><label>الحرف (م1 فقط)</label><InputText v-model="weekForm.letter" class="w-full" /></div>
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
  </div>
</template>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: flex-start; }
.header-btns { display: flex; gap: 8px; }
.level-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.level-tab { border: 2px solid var(--border-color); background: white; border-radius: 10px; padding: 8px 20px; font-family: var(--font-family); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.15s; color: var(--text-secondary); }
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
