<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useContentStore } from '@/stores/content'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Tag from 'primevue/tag'
import MultiSelect from 'primevue/multiselect'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const contentStore = useContentStore()

const loading = ref(false)
const unitsList = ref([])
const unitStats = ref({})

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showCloneDialog = ref(false)
const showDeleteDialog = ref(false)
const showTemplateDialog = ref(false)

const deleteConfirmName = ref('')
const unitToDelete = ref(null)
const unitToClone = ref(null)
const cloneForm = ref({ name: '', description: '' })

const dayOptions = [
  { label: 'الأحد', value: 'sunday' },
  { label: 'الإثنين', value: 'monday' },
  { label: 'الثلاثاء', value: 'tuesday' },
  { label: 'الأربعاء', value: 'wednesday' },
  { label: 'الخميس', value: 'thursday' }
]

const emptyForm = () => ({
  name: '',
  description: '',
  year: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
  start_date: '',
  session_days: ['sunday', 'tuesday'],
  weeks_count: 12,
  sessions_per_week: 2,
  session_duration: 45,
  is_active: false,
  is_template: false
})

const createForm = ref(emptyForm())
const editForm = ref(emptyForm())

onMounted(async () => {
  await loadUnits()
})

async function loadUnits() {
  loading.value = true
  await contentStore.fetchUnits()
  unitsList.value = contentStore.units

  // Fetch stats for each unit
  for (const unit of unitsList.value) {
    const [
      { count: weekCount },
      { count: dayCount },
      { count: activityCount }
    ] = await Promise.all([
      supabase.from('weeks').select('*', { count: 'exact', head: true }).eq('unit_id', unit.id),
      supabase.from('days').select('*', { count: 'exact', head: true }).eq('week_id', supabase.from('weeks').select('id').eq('unit_id', unit.id)),
      supabase.from('activities').select('*', { count: 'exact', head: true }).eq('unit_id', unit.id)
    ])
    unitStats.value[unit.id] = {
      weeks: weekCount || 0,
      days: dayCount || 0,
      activities: activityCount || 0
    }
  }

  // Fetch day counts via weeks
  for (const unit of unitsList.value) {
    const { data: weekIds } = await supabase.from('weeks').select('id').eq('unit_id', unit.id)
    if (weekIds?.length) {
      const { count } = await supabase.from('days').select('*', { count: 'exact', head: true }).in('week_id', weekIds.map(w => w.id))
      unitStats.value[unit.id].days = count || 0
    }
  }

  loading.value = false
}

const activeUnitId = computed(() => contentStore.activeUnit?.id)

// Create unit
function openCreateDialog() {
  createForm.value = emptyForm()
  showCreateDialog.value = true
}

async function createUnit() {
  const payload = { ...createForm.value, sort_order: (unitsList.value.length + 1) * 10 }
  const { error } = await supabase.from('units').insert(payload)
  if (error) {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
    return
  }
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم إنشاء الوحدة بنجاح', life: 3000 })
  showCreateDialog.value = false
  await loadUnits()
}

// Edit unit
function openEditDialog(unit) {
  editForm.value = { ...unit, session_days: unit.session_days || [] }
  showEditDialog.value = true
}

async function saveUnit() {
  const { id, created_at, updated_at, ...payload } = editForm.value
  const { error } = await supabase.from('units').update(payload).eq('id', id)
  if (error) {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
    return
  }
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم تحديث الوحدة', life: 3000 })
  showEditDialog.value = false
  await loadUnits()
  // Update active unit if it was edited
  if (contentStore.activeUnit?.id === id) {
    await contentStore.fetchUnits()
  }
}

// Clone unit
function openCloneDialog(unit) {
  unitToClone.value = unit
  cloneForm.value = { name: `نسخة من ${unit.name}`, description: unit.description || '' }
  showCloneDialog.value = true
}

async function cloneUnit() {
  loading.value = true
  const { error } = await contentStore.cloneUnit(unitToClone.value.id, cloneForm.value.name, cloneForm.value.description)
  loading.value = false
  if (error) {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
    return
  }
  toast.add({ severity: 'success', summary: 'تم', detail: 'تم نسخ الوحدة بجميع محتوياتها', life: 3000 })
  showCloneDialog.value = false
  await loadUnits()
}

// Create from template
async function createFromTemplate() {
  const payload = {
    name: createForm.value.name || 'وحدة جديدة',
    description: createForm.value.description || '',
    year: createForm.value.year,
    start_date: createForm.value.start_date || null,
    session_days: createForm.value.session_days || ['sunday', 'tuesday'],
    weeks_count: 12,
    sessions_per_week: 2,
    session_duration: 45,
    is_active: false,
    is_template: false,
    sort_order: (unitsList.value.length + 1) * 10
  }

  const { data: newUnit, error } = await supabase.from('units').insert(payload).select().single()
  if (error) {
    toast.add({ severity: 'error', summary: 'خطأ', detail: error.message, life: 5000 })
    return
  }

  // Create 12 weeks x 2 days for each level
  const levels = contentStore.levelsData || []
  for (const level of levels) {
    const weekInserts = []
    for (let w = 1; w <= 12; w++) {
      weekInserts.push({
        unit_id: newUnit.id,
        level_id: level.id,
        week_number: w,
        title: `الأسبوع ${w}`
      })
    }
    const { data: newWeeks } = await supabase.from('weeks').insert(weekInserts).select('id')
    if (newWeeks) {
      const dayInserts = []
      for (const week of newWeeks) {
        dayInserts.push(
          { week_id: week.id, day_number: 1, title: 'اليوم الأول' },
          { week_id: week.id, day_number: 2, title: 'اليوم الثاني' }
        )
      }
      await supabase.from('days').insert(dayInserts)
    }
  }

  toast.add({ severity: 'success', summary: 'تم', detail: 'تم إنشاء وحدة فارغة مع 12 أسبوع و 24 يوم لكل مستوى', life: 4000 })
  showTemplateDialog.value = false
  await loadUnits()
}

// Delete unit
function openDeleteDialog(unit) {
  unitToDelete.value = unit
  deleteConfirmName.value = ''
  showDeleteDialog.value = true
}

const canDelete = computed(() => deleteConfirmName.value === unitToDelete.value?.name)

async function deleteUnit() {
  if (!canDelete.value) return
  loading.value = true
  const unitId = unitToDelete.value.id

  // Delete all related content
  // 1. Get weeks for this unit
  const { data: unitWeeks } = await supabase.from('weeks').select('id').eq('unit_id', unitId)
  if (unitWeeks?.length) {
    const weekIds = unitWeeks.map(w => w.id)
    // Delete day_step_activities via days
    const { data: unitDays } = await supabase.from('days').select('id').in('week_id', weekIds)
    if (unitDays?.length) {
      await supabase.from('day_step_activities').delete().in('day_id', unitDays.map(d => d.id))
      await supabase.from('comments').delete().in('day_id', unitDays.map(d => d.id))
    }
    await supabase.from('days').delete().in('week_id', weekIds)
    await supabase.from('weeks').delete().eq('unit_id', unitId)
  }

  // 2. Delete level_axes and axis_objectives
  const { data: axes } = await supabase.from('level_axes').select('id').eq('unit_id', unitId)
  if (axes?.length) {
    await supabase.from('axis_objectives').delete().in('axis_id', axes.map(a => a.id))
  }
  await supabase.from('level_axes').delete().eq('unit_id', unitId)

  // 3. Delete other content tables
  await supabase.from('activities').delete().eq('unit_id', unitId)
  await supabase.from('assessment_items').delete().eq('unit_id', unitId)
  await supabase.from('session_patterns').delete().eq('unit_id', unitId)
  await supabase.from('listening_goals').delete().eq('unit_id', unitId)
  await supabase.from('faq_items').delete().eq('unit_id', unitId)
  await supabase.from('implementation_tips').delete().eq('unit_id', unitId)
  await supabase.from('progression_items').delete().eq('unit_id', unitId)

  // 4. Delete the unit itself
  await supabase.from('units').delete().eq('id', unitId)

  loading.value = false
  toast.add({ severity: 'success', summary: 'تم الحذف', detail: 'تم حذف الوحدة وجميع محتوياتها', life: 3000 })
  showDeleteDialog.value = false

  // Reset active unit if deleted
  if (contentStore.activeUnit?.id === unitId) {
    contentStore.activeUnit = null
  }
  await loadUnits()
}

// Set active
async function setActiveUnit(unit) {
  // Deactivate all, then activate the selected one
  await supabase.from('units').update({ is_active: false }).neq('id', 'none')
  await supabase.from('units').update({ is_active: true }).eq('id', unit.id)
  await contentStore.setActiveUnit(unit.id)
  await loadUnits()
  toast.add({ severity: 'success', summary: 'تم', detail: `تم تفعيل "${unit.name}"`, life: 3000 })
}

function getDayLabel(day) {
  const map = { sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس' }
  return map[day] || day
}
</script>

<template>
  <div class="units-manage">
    <div class="page-header">
      <div class="header-row">
        <div>
          <h1><i class="pi pi-folder" style="color: #845EF7"></i> إدارة الوحدات التعليمية</h1>
          <p>إنشاء ونسخ وإدارة الوحدات التعليمية ومحتوياتها</p>
        </div>
        <div class="header-btns">
          <Button label="إنشاء من قالب" icon="pi pi-copy" severity="secondary" size="small" @click="showTemplateDialog = true; createForm = emptyForm()" />
          <Button label="إنشاء وحدة جديدة" icon="pi pi-plus" size="small" @click="openCreateDialog" />
        </div>
      </div>
    </div>

    <!-- Active Unit Banner -->
    <div v-if="contentStore.activeUnit" class="active-unit-banner animate__animated animate__fadeIn">
      <div class="banner-content">
        <i class="pi pi-check-circle"></i>
        <div>
          <strong>الوحدة النشطة:</strong>
          <span>{{ contentStore.activeUnit.name }}</span>
        </div>
      </div>
      <Tag :value="contentStore.activeUnit.year || ''" severity="info" />
    </div>

    <!-- Units Grid -->
    <div class="units-grid" v-if="!loading">
      <div
        v-for="unit in unitsList"
        :key="unit.id"
        class="unit-card custom-card stagger-item"
        :class="{ 'is-active': unit.id === activeUnitId, 'is-template': unit.is_template }"
      >
        <div class="unit-card-header">
          <div class="unit-card-title">
            <h3>{{ unit.name }}</h3>
            <div class="unit-tags">
              <Tag v-if="unit.id === activeUnitId" value="نشطة" severity="success" />
              <Tag v-if="unit.is_template" value="قالب" severity="warning" />
              <Tag v-if="unit.year" :value="unit.year" severity="info" />
            </div>
          </div>
        </div>

        <p v-if="unit.description" class="unit-description">{{ unit.description }}</p>

        <div class="unit-meta">
          <div v-if="unit.start_date" class="meta-item">
            <i class="pi pi-calendar"></i>
            <span>{{ unit.start_date }}</span>
          </div>
          <div v-if="unit.session_days?.length" class="meta-item">
            <i class="pi pi-clock"></i>
            <span>{{ unit.session_days.map(getDayLabel).join(' - ') }}</span>
          </div>
          <div class="meta-item">
            <i class="pi pi-book"></i>
            <span>{{ unit.weeks_count || 12 }} أسبوع / {{ unit.sessions_per_week || 2 }} حصص</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="unit-stats-row">
          <div class="unit-stat">
            <span class="stat-num">{{ unitStats[unit.id]?.weeks || 0 }}</span>
            <span class="stat-lbl">أسبوع</span>
          </div>
          <div class="unit-stat">
            <span class="stat-num">{{ unitStats[unit.id]?.days || 0 }}</span>
            <span class="stat-lbl">يوم</span>
          </div>
          <div class="unit-stat">
            <span class="stat-num">{{ unitStats[unit.id]?.activities || 0 }}</span>
            <span class="stat-lbl">نشاط</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="unit-actions">
          <Button
            v-if="unit.id !== activeUnitId"
            label="تفعيل"
            icon="pi pi-check"
            size="small"
            severity="success"
            outlined
            @click="setActiveUnit(unit)"
          />
          <Button
            v-else
            label="نشطة"
            icon="pi pi-check-circle"
            size="small"
            severity="success"
            disabled
          />
          <Button icon="pi pi-pencil" text rounded size="small" v-tooltip="'تعديل'" @click="openEditDialog(unit)" />
          <Button icon="pi pi-copy" text rounded size="small" v-tooltip="'نسخ'" @click="openCloneDialog(unit)" />
          <Button icon="pi pi-trash" text rounded size="small" severity="danger" v-tooltip="'حذف'" @click="openDeleteDialog(unit)" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!unitsList.length" class="empty-state custom-card no-hover" style="grid-column: 1 / -1; padding: 60px; text-align: center;">
        <i class="pi pi-folder-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></i>
        <h3>لا توجد وحدات تعليمية</h3>
        <p>ابدأ بإنشاء وحدة جديدة أو إنشاء وحدة من قالب</p>
        <div style="display: flex; gap: 8px; justify-content: center; margin-top: 16px;">
          <Button label="إنشاء وحدة جديدة" icon="pi pi-plus" @click="openCreateDialog" />
          <Button label="إنشاء من قالب" icon="pi pi-copy" severity="secondary" @click="showTemplateDialog = true; createForm = emptyForm()" />
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--primary-color)"></i>
      <p>جاري التحميل...</p>
    </div>

    <!-- Create Dialog -->
    <Dialog v-model:visible="showCreateDialog" header="إنشاء وحدة جديدة" :style="{ width: '550px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>اسم الوحدة *</label>
          <InputText v-model="createForm.name" class="w-full" placeholder="مثال: الوحدة الأولى - الفصل الأول" />
        </div>
        <div class="form-field">
          <label>الوصف</label>
          <Textarea v-model="createForm.description" rows="3" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>السنة الدراسية</label>
            <InputText v-model="createForm.year" class="w-full" placeholder="2025/2026" />
          </div>
          <div class="form-field">
            <label>تاريخ البدء</label>
            <InputText v-model="createForm.start_date" type="date" class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>أيام الحصص</label>
          <MultiSelect v-model="createForm.session_days" :options="dayOptions" optionLabel="label" optionValue="value" class="w-full" placeholder="اختر أيام الحصص" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>عدد الأسابيع</label>
            <InputText v-model.number="createForm.weeks_count" type="number" class="w-full" />
          </div>
          <div class="form-field">
            <label>حصص/أسبوع</label>
            <InputText v-model.number="createForm.sessions_per_week" type="number" class="w-full" />
          </div>
          <div class="form-field">
            <label>مدة الحصة (دقيقة)</label>
            <InputText v-model.number="createForm.session_duration" type="number" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showCreateDialog = false" />
        <Button label="إنشاء" icon="pi pi-check" @click="createUnit" :disabled="!createForm.name" />
      </template>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog v-model:visible="showEditDialog" header="تعديل الوحدة" :style="{ width: '550px' }" modal>
      <div class="dialog-form">
        <div class="form-field">
          <label>اسم الوحدة *</label>
          <InputText v-model="editForm.name" class="w-full" />
        </div>
        <div class="form-field">
          <label>الوصف</label>
          <Textarea v-model="editForm.description" rows="3" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>السنة الدراسية</label>
            <InputText v-model="editForm.year" class="w-full" />
          </div>
          <div class="form-field">
            <label>تاريخ البدء</label>
            <InputText v-model="editForm.start_date" type="date" class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>أيام الحصص</label>
          <MultiSelect v-model="editForm.session_days" :options="dayOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>عدد الأسابيع</label>
            <InputText v-model.number="editForm.weeks_count" type="number" class="w-full" />
          </div>
          <div class="form-field">
            <label>حصص/أسبوع</label>
            <InputText v-model.number="editForm.sessions_per_week" type="number" class="w-full" />
          </div>
          <div class="form-field">
            <label>مدة الحصة (دقيقة)</label>
            <InputText v-model.number="editForm.session_duration" type="number" class="w-full" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field" style="flex-direction: row; align-items: center; gap: 8px;">
            <input type="checkbox" v-model="editForm.is_template" id="is_template" />
            <label for="is_template" style="margin: 0;">قالب</label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showEditDialog = false" />
        <Button label="حفظ" icon="pi pi-check" @click="saveUnit" :disabled="!editForm.name" />
      </template>
    </Dialog>

    <!-- Clone Dialog -->
    <Dialog v-model:visible="showCloneDialog" header="نسخ الوحدة" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <p class="clone-info">
          <i class="pi pi-info-circle"></i>
          سيتم نسخ جميع المحتويات من الوحدة "{{ unitToClone?.name }}" بما في ذلك الأسابيع والأيام والأنشطة والتقييمات.
        </p>
        <div class="form-field">
          <label>اسم الوحدة الجديدة *</label>
          <InputText v-model="cloneForm.name" class="w-full" />
        </div>
        <div class="form-field">
          <label>الوصف</label>
          <Textarea v-model="cloneForm.description" rows="2" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showCloneDialog = false" />
        <Button label="نسخ" icon="pi pi-copy" @click="cloneUnit" :disabled="!cloneForm.name" :loading="loading" />
      </template>
    </Dialog>

    <!-- Template Dialog -->
    <Dialog v-model:visible="showTemplateDialog" header="إنشاء وحدة من قالب" :style="{ width: '500px' }" modal>
      <div class="dialog-form">
        <p class="clone-info">
          <i class="pi pi-info-circle"></i>
          سيتم إنشاء وحدة فارغة تحتوي على 12 أسبوع ويومين لكل أسبوع لكل مستوى تعليمي.
        </p>
        <div class="form-field">
          <label>اسم الوحدة *</label>
          <InputText v-model="createForm.name" class="w-full" placeholder="مثال: الوحدة الجديدة" />
        </div>
        <div class="form-field">
          <label>الوصف</label>
          <Textarea v-model="createForm.description" rows="2" class="w-full" />
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>السنة الدراسية</label>
            <InputText v-model="createForm.year" class="w-full" />
          </div>
          <div class="form-field">
            <label>تاريخ البدء</label>
            <InputText v-model="createForm.start_date" type="date" class="w-full" />
          </div>
        </div>
        <div class="form-field">
          <label>أيام الحصص</label>
          <MultiSelect v-model="createForm.session_days" :options="dayOptions" optionLabel="label" optionValue="value" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showTemplateDialog = false" />
        <Button label="إنشاء من قالب" icon="pi pi-copy" @click="createFromTemplate" :disabled="!createForm.name" />
      </template>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:visible="showDeleteDialog" header="تأكيد حذف الوحدة" :style="{ width: '450px' }" modal>
      <div class="dialog-form">
        <div class="delete-warning">
          <i class="pi pi-exclamation-triangle"></i>
          <div>
            <strong>تحذير: هذا الإجراء لا يمكن التراجع عنه!</strong>
            <p>سيتم حذف الوحدة "{{ unitToDelete?.name }}" وجميع محتوياتها بشكل نهائي بما في ذلك:</p>
            <ul>
              <li>جميع الأسابيع والأيام</li>
              <li>جميع الأنشطة والتقييمات</li>
              <li>جميع أنماط الحصص والمحاور</li>
              <li>جميع التعليقات والملاحظات</li>
            </ul>
          </div>
        </div>
        <div class="form-field">
          <label>اكتب اسم الوحدة "{{ unitToDelete?.name }}" للتأكيد:</label>
          <InputText v-model="deleteConfirmName" class="w-full" :placeholder="unitToDelete?.name" />
        </div>
      </div>
      <template #footer>
        <Button label="إلغاء" text @click="showDeleteDialog = false" />
        <Button label="حذف نهائي" icon="pi pi-trash" severity="danger" @click="deleteUnit" :disabled="!canDelete" :loading="loading" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-btns {
  display: flex;
  gap: 8px;
}

.active-unit-banner {
  background: linear-gradient(135deg, #d3f9d8, #b2f2bb);
  border: 1px solid #69db7c;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.banner-content i {
  font-size: 1.3rem;
  color: #2b8a3e;
}

.banner-content strong {
  color: #2b8a3e;
}

.units-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.unit-card {
  padding: 20px;
  border: 2px solid var(--border-color);
  transition: all 0.2s ease;
}

.unit-card.is-active {
  border-color: #51CF66;
  background: linear-gradient(135deg, #f8fff8, white);
}

.unit-card.is-template {
  border-style: dashed;
}

.unit-card-header {
  margin-bottom: 10px;
}

.unit-card-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.unit-card-title h3 {
  font-size: 1.1rem;
  margin: 0;
  flex: 1;
}

.unit-tags {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.unit-description {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.unit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.meta-item i {
  font-size: 0.85rem;
}

.unit-stats-row {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 12px;
}

.unit-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-num {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-lbl {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.unit-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-state {
  text-align: center;
  padding: 60px;
}

.loading-state p {
  margin-top: 12px;
  color: var(--text-muted);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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

.w-full {
  width: 100%;
}

.clone-info {
  background: #E3F2FD;
  border: 1px solid #90CAF9;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 0.85rem;
  color: #1565C0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.clone-info i {
  margin-top: 2px;
  flex-shrink: 0;
}

.delete-warning {
  background: #FFF3E0;
  border: 1px solid #FFB74D;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
}

.delete-warning i {
  font-size: 1.5rem;
  color: #E65100;
  flex-shrink: 0;
  margin-top: 2px;
}

.delete-warning strong {
  color: #E65100;
  display: block;
  margin-bottom: 6px;
}

.delete-warning p {
  font-size: 0.85rem;
  margin: 0 0 8px;
}

.delete-warning ul {
  font-size: 0.8rem;
  padding-right: 20px;
  margin: 0;
}

.delete-warning li {
  margin-bottom: 2px;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 12px;
  }
  .units-grid {
    grid-template-columns: 1fr;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
