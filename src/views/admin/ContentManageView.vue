<script setup>
import { ref, onMounted } from 'vue'
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
const days = ref([])
const loading = ref(false)
const showWeekDialog = ref(false)
const showDayDialog = ref(false)
const editMode = ref(false)
const selectedItem = ref(null)

const weekForm = ref({ level_id: 1, week_number: 1, title: '', letter: '', notes: '' })
const dayForm = ref({ week_id: null, day_number: 1, title: '', scenario_notes: '', is_completed: false, completion_notes: '' })

const levelOptions = [
  { label: 'المستوى الأول', value: 1 },
  { label: 'المستوى الثاني', value: 2 },
  { label: 'المستوى الثالث', value: 3 }
]

onMounted(() => {
  fetchWeeks()
  fetchDays()
})

async function fetchWeeks() {
  loading.value = true
  const { data } = await supabase.from('weeks').select('*').order('level_id').order('week_number')
  weeks.value = data || []
  loading.value = false
}

async function fetchDays() {
  const { data } = await supabase.from('days').select('*, weeks(title, level_id)').order('week_id').order('day_number')
  days.value = data || []
}

function openAddWeek() {
  editMode.value = false
  weekForm.value = { level_id: 1, week_number: 1, title: '', letter: '', notes: '' }
  showWeekDialog.value = true
}

function openEditWeek(week) {
  editMode.value = true
  selectedItem.value = week
  weekForm.value = { ...week }
  showWeekDialog.value = true
}

async function saveWeek() {
  if (editMode.value) {
    const { error } = await supabase.from('weeks').update(weekForm.value).eq('id', selectedItem.value.id)
    if (!error) {
      toast.add({ severity: 'success', summary: 'تم', detail: 'تم تحديث الأسبوع', life: 3000 })
      await fetchWeeks()
      showWeekDialog.value = false
    }
  } else {
    const { error } = await supabase.from('weeks').insert(weekForm.value)
    if (!error) {
      toast.add({ severity: 'success', summary: 'تم', detail: 'تم إضافة الأسبوع', life: 3000 })
      await fetchWeeks()
      showWeekDialog.value = false
    }
  }
}

function confirmDeleteWeek(week) {
  confirm.require({
    message: `هل أنت متأكد من حذف ${week.title}؟`,
    header: 'تأكيد الحذف',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'حذف',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await supabase.from('weeks').delete().eq('id', week.id)
      toast.add({ severity: 'success', summary: 'تم', detail: 'تم الحذف', life: 3000 })
      await fetchWeeks()
    }
  })
}

function openAddDay() {
  editMode.value = false
  dayForm.value = { week_id: weeks.value[0]?.id, day_number: 1, title: '', scenario_notes: '', is_completed: false, completion_notes: '' }
  showDayDialog.value = true
}

function openEditDay(day) {
  editMode.value = true
  selectedItem.value = day
  dayForm.value = { ...day }
  showDayDialog.value = true
}

async function saveDay() {
  const payload = { ...dayForm.value }
  delete payload.weeks
  if (editMode.value) {
    const { error } = await supabase.from('days').update(payload).eq('id', selectedItem.value.id)
    if (!error) {
      toast.add({ severity: 'success', summary: 'تم', detail: 'تم تحديث اليوم', life: 3000 })
      await fetchDays()
      showDayDialog.value = false
    }
  } else {
    const { error } = await supabase.from('days').insert(payload)
    if (!error) {
      toast.add({ severity: 'success', summary: 'تم', detail: 'تم إضافة اليوم', life: 3000 })
      await fetchDays()
      showDayDialog.value = false
    }
  }
}

function confirmDeleteDay(day) {
  confirm.require({
    message: `هل أنت متأكد من حذف ${day.title}؟`,
    header: 'تأكيد الحذف',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'حذف',
    rejectLabel: 'إلغاء',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await supabase.from('days').delete().eq('id', day.id)
      await fetchDays()
    }
  })
}

async function generateAllWeeks() {
  const letters = ['ا', 'ب', 'ح', 'د', 'ر', 'س', 'ش', 'ع', 'ف', 'ك', 'ل', 'م']
  const inserts = []

  for (let levelId = 1; levelId <= 3; levelId++) {
    for (let w = 1; w <= 12; w++) {
      inserts.push({
        level_id: levelId,
        week_number: w,
        title: `الأسبوع ${w}`,
        letter: levelId === 1 ? (letters[w - 1] || '') : ''
      })
    }
  }

  const { error } = await supabase.from('weeks').insert(inserts)
  if (!error) {
    toast.add({ severity: 'success', summary: 'تم', detail: 'تم إنشاء جميع الأسابيع', life: 3000 })
    await fetchWeeks()

    // Generate days for each week
    const weekData = await supabase.from('weeks').select('id')
    if (weekData.data) {
      const dayInserts = []
      for (const week of weekData.data) {
        dayInserts.push(
          { week_id: week.id, day_number: 1, title: 'اليوم الأول' },
          { week_id: week.id, day_number: 2, title: 'اليوم الثاني' }
        )
      }
      await supabase.from('days').insert(dayInserts)
      await fetchDays()
    }
  }
}
</script>

<template>
  <div class="content-manage">
    <div class="page-header animate__animated animate__fadeIn">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1><i class="pi pi-cog" style="color: #FF9F43"></i> إدارة المحتوى</h1>
          <p>إدارة الأسابيع والأيام والمحتوى التعليمي</p>
        </div>
        <Button
          v-if="!weeks.length"
          label="إنشاء جميع الأسابيع تلقائياً"
          icon="pi pi-bolt"
          severity="warn"
          @click="generateAllWeeks"
        />
      </div>
    </div>

    <TabView>
      <TabPanel header="الأسابيع">
        <div class="tab-toolbar">
          <Button label="إضافة أسبوع" icon="pi pi-plus" size="small" @click="openAddWeek" />
        </div>
        <DataTable :value="weeks" :loading="loading" stripedRows responsiveLayout="scroll" paginator :rows="12"
                   emptyMessage="لا توجد أسابيع - اضغط زر الإنشاء التلقائي">
          <Column field="level_id" header="المستوى" sortable>
            <template #body="{ data }">
              <Tag :value="`المستوى ${data.level_id}`"
                   :severity="data.level_id === 1 ? 'success' : data.level_id === 2 ? 'warn' : 'info'" />
            </template>
          </Column>
          <Column field="week_number" header="رقم الأسبوع" sortable />
          <Column field="title" header="العنوان" />
          <Column field="letter" header="الحرف" />
          <Column header="الإجراءات" style="width: 120px">
            <template #body="{ data }">
              <Button icon="pi pi-pencil" text rounded severity="info" @click="openEditWeek(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDeleteWeek(data)" />
            </template>
          </Column>
        </DataTable>
      </TabPanel>

      <TabPanel header="الأيام">
        <div class="tab-toolbar">
          <Button label="إضافة يوم" icon="pi pi-plus" size="small" @click="openAddDay" />
        </div>
        <DataTable :value="days" stripedRows responsiveLayout="scroll" paginator :rows="20"
                   emptyMessage="لا توجد أيام">
          <Column header="الأسبوع">
            <template #body="{ data }">
              {{ data.weeks?.title || `أسبوع ${data.week_id}` }}
            </template>
          </Column>
          <Column field="day_number" header="رقم اليوم" sortable />
          <Column field="title" header="العنوان" />
          <Column field="is_completed" header="الحالة">
            <template #body="{ data }">
              <Tag :value="data.is_completed ? 'مكتمل' : 'قيد التنفيذ'"
                   :severity="data.is_completed ? 'success' : 'warn'" />
            </template>
          </Column>
          <Column header="الإجراءات" style="width: 120px">
            <template #body="{ data }">
              <Button icon="pi pi-pencil" text rounded severity="info" @click="openEditDay(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" @click="confirmDeleteDay(data)" />
            </template>
          </Column>
        </DataTable>
      </TabPanel>
    </TabView>

    <!-- Week Dialog -->
    <Dialog v-model:visible="showWeekDialog" :header="editMode ? 'تعديل أسبوع' : 'إضافة أسبوع'" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>المستوى</label>
          <Dropdown v-model="weekForm.level_id" :options="levelOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="form-field">
          <label>رقم الأسبوع</label>
          <InputText v-model.number="weekForm.week_number" type="number" class="w-full" />
        </div>
        <div class="form-field">
          <label>العنوان</label>
          <InputText v-model="weekForm.title" placeholder="عنوان الأسبوع" class="w-full" />
        </div>
        <div class="form-field">
          <label>الحرف</label>
          <InputText v-model="weekForm.letter" placeholder="الحرف (للمستوى الأول)" class="w-full" />
        </div>
        <div class="form-field">
          <label>ملاحظات</label>
          <Textarea v-model="weekForm.notes" rows="3" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showWeekDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveWeek" />
      </template>
    </Dialog>

    <!-- Day Dialog -->
    <Dialog v-model:visible="showDayDialog" :header="editMode ? 'تعديل يوم' : 'إضافة يوم'" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>الأسبوع</label>
          <Dropdown v-model="dayForm.week_id" :options="weeks" optionLabel="title" optionValue="id" class="w-full" placeholder="اختر الأسبوع" />
        </div>
        <div class="form-field">
          <label>رقم اليوم</label>
          <InputText v-model.number="dayForm.day_number" type="number" class="w-full" />
        </div>
        <div class="form-field">
          <label>العنوان</label>
          <InputText v-model="dayForm.title" placeholder="عنوان اليوم" class="w-full" />
        </div>
        <div class="form-field">
          <label>ملاحظات السيناريو</label>
          <Textarea v-model="dayForm.scenario_notes" rows="4" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showDayDialog = false" />
        <Button :label="editMode ? 'حفظ' : 'إضافة'" icon="pi pi-check" @click="saveDay" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.tab-toolbar {
  margin-bottom: 16px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 0.9rem;
  font-weight: 600;
}

.w-full { width: 100%; }
</style>
